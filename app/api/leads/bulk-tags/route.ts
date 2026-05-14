import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidLeadTagName, normalizeLeadTagName } from "@/lib/leadTags";

const MAX_BULK = 400;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rawIds = body.leadIds;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return NextResponse.json({ error: "leadIds が必要です" }, { status: 400 });
  }
  const leadIds = [...new Set(rawIds.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean))];
  if (leadIds.length === 0) {
    return NextResponse.json({ error: "有効な leadIds がありません" }, { status: 400 });
  }
  if (leadIds.length > MAX_BULK) {
    return NextResponse.json({ error: `一度に付与できるのは ${MAX_BULK} 件までです` }, { status: 400 });
  }

  const tagIdRaw = typeof body.tagId === "string" ? body.tagId.trim() : "";
  const tagNameRaw = typeof body.tagName === "string" ? body.tagName : "";

  let resolvedTagId: string | null = null;

  const normalizedName = normalizeLeadTagName(tagNameRaw);
  if (normalizedName.length > 0) {
    if (!isValidLeadTagName(normalizedName)) {
      return NextResponse.json({ error: "タグ名が不正です" }, { status: 400 });
    }
    const tag = await prisma.leadTag.upsert({
      where: { name: normalizedName },
      create: { name: normalizedName },
      update: {},
      select: { id: true },
    });
    resolvedTagId = tag.id;
  } else if (tagIdRaw !== "") {
    const tag = await prisma.leadTag.findUnique({
      where: { id: tagIdRaw },
      select: { id: true },
    });
    if (!tag) {
      return NextResponse.json({ error: "タグが見つかりません" }, { status: 404 });
    }
    resolvedTagId = tag.id;
  } else {
    return NextResponse.json({ error: "tagId または tagName のどちらかが必要です" }, { status: 400 });
  }

  const found = await prisma.lead.count({ where: { id: { in: leadIds } } });
  if (found !== leadIds.length) {
    return NextResponse.json({ error: "一部のリードが見つかりません" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      leadIds.map((id) =>
        prisma.lead.update({
          where: { id },
          data: {
            tags: { connect: { id: resolvedTagId! } },
          },
        }),
      ),
    );
    return NextResponse.json({ ok: true, tagId: resolvedTagId, affected: leadIds.length });
  } catch (e: unknown) {
    console.error("bulk-tags", e);
    return NextResponse.json({ error: "タグの付与に失敗しました" }, { status: 500 });
  }
}
