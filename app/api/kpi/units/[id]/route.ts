import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const existing = await prisma.kpiUnit.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: { name?: string; symbol?: string; position?: string; sortOrder?: number } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.symbol === "string" && body.symbol.trim()) data.symbol = body.symbol.trim();
  if (body.position === "prefix" || body.position === "suffix") data.position = body.position;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = body.sortOrder;
  }

  const item = await prisma.kpiUnit.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const existing = await prisma.kpiUnit.findUnique({
    where: { id },
    include: { _count: { select: { kpis: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (existing._count.kpis > 0) {
    return NextResponse.json({ error: "unit in use" }, { status: 409 });
  }

  await prisma.kpiUnit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
