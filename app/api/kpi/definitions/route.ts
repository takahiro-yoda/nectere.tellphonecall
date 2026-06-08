import { NextRequest, NextResponse } from "next/server";
import { KpiDataSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureDefaultUnits, KPI_DATA_SOURCE_LABELS } from "@/lib/kpi";

export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set<string>(Object.keys(KpiDataSource));

export async function GET() {
  await ensureDefaultUnits();
  const items = await prisma.kpiDefinition.findMany({
    include: { unit: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      dataSourceLabel: KPI_DATA_SOURCE_LABELS[item.dataSource],
    })),
  });
}

export async function POST(request: NextRequest) {
  await ensureDefaultUnits();
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const unitId = typeof body.unitId === "string" ? body.unitId : "";
  const dataSource =
    typeof body.dataSource === "string" && VALID_SOURCES.has(body.dataSource)
      ? (body.dataSource as KpiDataSource)
      : "MANUAL";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!unitId) {
    return NextResponse.json({ error: "unitId is required" }, { status: 400 });
  }

  const unit = await prisma.kpiUnit.findUnique({ where: { id: unitId } });
  if (!unit) {
    return NextResponse.json({ error: "unit not found" }, { status: 404 });
  }

  const maxSort = await prisma.kpiDefinition.aggregate({ _max: { sortOrder: true } });
  const item = await prisma.kpiDefinition.create({
    data: {
      name,
      unitId,
      dataSource,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
    include: { unit: true },
  });
  return NextResponse.json({ item });
}
