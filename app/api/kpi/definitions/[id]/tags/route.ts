import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchKpiDefinitionTags, resolveTagId } from "@/lib/recordTagMutations";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: kpiDefinitionId } = await context.params;
  const existing = await prisma.kpiDefinition.findUnique({
    where: { id: kpiDefinitionId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const resolved = await resolveTagId(
    prisma.kpiTag,
    typeof body.tagId === "string" ? body.tagId : "",
    typeof body.tagName === "string" ? body.tagName : "",
  );
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  try {
    await prisma.kpiDefinition.update({
      where: { id: kpiDefinitionId },
      data: { tags: { connect: { id: resolved.tagId } } },
    });
    const tags = await fetchKpiDefinitionTags(prisma, kpiDefinitionId);
    return NextResponse.json({ tags });
  } catch (e: unknown) {
    console.error("kpi definition tag POST", e);
    return NextResponse.json({ error: "タグの追加に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: kpiDefinitionId } = await context.params;
  const existing = await prisma.kpiDefinition.findUnique({
    where: { id: kpiDefinitionId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tagId = typeof body.tagId === "string" ? body.tagId.trim() : "";
  if (!tagId) {
    return NextResponse.json({ error: "tagId が必要です" }, { status: 400 });
  }

  try {
    await prisma.kpiDefinition.update({
      where: { id: kpiDefinitionId },
      data: { tags: { disconnect: { id: tagId } } },
    });
    const tags = await fetchKpiDefinitionTags(prisma, kpiDefinitionId);
    return NextResponse.json({ tags });
  } catch (e: unknown) {
    console.error("kpi definition tag DELETE", e);
    return NextResponse.json({ error: "タグの削除に失敗しました" }, { status: 500 });
  }
}
