import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchLeadTags, resolveTagId } from "@/lib/recordTagMutations";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  const existing = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const resolved = await resolveTagId(
    prisma.leadTag,
    typeof body.tagId === "string" ? body.tagId : "",
    typeof body.tagName === "string" ? body.tagName : "",
  );
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { tags: { connect: { id: resolved.tagId } } },
    });
    const tags = await fetchLeadTags(prisma, leadId);
    return NextResponse.json({ tags });
  } catch (e: unknown) {
    console.error("lead tag POST", e);
    return NextResponse.json({ error: "タグの追加に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  const existing = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tagId = typeof body.tagId === "string" ? body.tagId.trim() : "";
  if (!tagId) {
    return NextResponse.json({ error: "tagId が必要です" }, { status: 400 });
  }

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { tags: { disconnect: { id: tagId } } },
    });
    const tags = await fetchLeadTags(prisma, leadId);
    return NextResponse.json({ tags });
  } catch (e: unknown) {
    console.error("lead tag DELETE", e);
    return NextResponse.json({ error: "タグの削除に失敗しました" }, { status: 500 });
  }
}
