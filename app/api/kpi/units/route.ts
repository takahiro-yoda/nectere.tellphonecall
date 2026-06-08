import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDefaultUnits } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureDefaultUnits();
  const items = await prisma.kpiUnit.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  await ensureDefaultUnits();
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
  const position = body.position === "prefix" ? "prefix" : "suffix";

  if (!name || !symbol) {
    return NextResponse.json({ error: "name and symbol are required" }, { status: 400 });
  }

  const maxSort = await prisma.kpiUnit.aggregate({ _max: { sortOrder: true } });
  const item = await prisma.kpiUnit.create({
    data: {
      name,
      symbol,
      position,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json({ item });
}
