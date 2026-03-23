import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function nonNegInt(v: unknown): v is number {
  return typeof v === "number" && v >= 0 && Number.isInteger(v);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json();

  const data: { name?: string; revenuePerContractYen?: number; variableCostPerContractYen?: number } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (body.revenuePerContractYen !== undefined) {
    if (!nonNegInt(body.revenuePerContractYen)) {
      return NextResponse.json({ error: "revenuePerContractYen must be a non-negative integer" }, { status: 400 });
    }
    data.revenuePerContractYen = body.revenuePerContractYen;
  }
  if (body.variableCostPerContractYen !== undefined) {
    if (!nonNegInt(body.variableCostPerContractYen)) {
      return NextResponse.json({ error: "variableCostPerContractYen must be a non-negative integer" }, { status: 400 });
    }
    data.variableCostPerContractYen = body.variableCostPerContractYen;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  try {
    const row = await prisma.pricingCourse.update({
      where: { id },
      data,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await prisma.pricingCourse.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
