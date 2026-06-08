import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidKpiTagName, normalizeKpiTagName } from "@/lib/kpiTags";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.kpiTag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const nameRaw = typeof body.name === "string" ? body.name : "";
  const name = normalizeKpiTagName(nameRaw);
  if (!isValidKpiTagName(name)) {
    return NextResponse.json({ error: "タグ名が不正です" }, { status: 400 });
  }
  try {
    const created = await prisma.kpiTag.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json(created);
  } catch (e: unknown) {
    console.error("kpi-tags POST", e);
    return NextResponse.json({ error: "タグの作成に失敗しました" }, { status: 500 });
  }
}
