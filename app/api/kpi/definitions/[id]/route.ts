import { NextRequest, NextResponse } from "next/server";
import { KpiDataSource } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_SOURCES = new Set<string>(Object.keys(KpiDataSource));

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const existing = await prisma.kpiDefinition.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: {
    name?: string;
    unitId?: string;
    dataSource?: KpiDataSource;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.unitId === "string" && body.unitId) {
    const unit = await prisma.kpiUnit.findUnique({ where: { id: body.unitId } });
    if (!unit) return NextResponse.json({ error: "unit not found" }, { status: 404 });
    data.unitId = body.unitId;
  }
  if (typeof body.dataSource === "string" && VALID_SOURCES.has(body.dataSource)) {
    data.dataSource = body.dataSource as KpiDataSource;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = body.sortOrder;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const item = await prisma.kpiDefinition.update({
    where: { id },
    data,
    include: { unit: true },
  });
  return NextResponse.json({ item });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const existing = await prisma.kpiDefinition.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.kpiDefinition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
