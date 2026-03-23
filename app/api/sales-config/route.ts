import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSalesConfig } from "@/lib/contracts";

export async function GET() {
  const row = await ensureSalesConfig();
  return NextResponse.json({
    defaultRevenuePerContractYen: row.defaultRevenuePerContractYen,
    monthlyFixedExpenseYen: row.monthlyFixedExpenseYen,
    variableCostPerContractYen: row.variableCostPerContractYen,
  });
}

function intField(name: string, v: unknown): number | null {
  if (v === undefined) return null;
  if (typeof v !== "number" || v < 0 || !Number.isInteger(v)) return null;
  return v;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const defRev = intField("defaultRevenuePerContractYen", body.defaultRevenuePerContractYen);
  const fixed = intField("monthlyFixedExpenseYen", body.monthlyFixedExpenseYen);
  const variable = intField("variableCostPerContractYen", body.variableCostPerContractYen);

  if (defRev === null) {
    return NextResponse.json({ error: "defaultRevenuePerContractYen must be a non-negative integer" }, { status: 400 });
  }
  if (fixed === null) {
    return NextResponse.json({ error: "monthlyFixedExpenseYen must be a non-negative integer" }, { status: 400 });
  }
  if (variable === null) {
    return NextResponse.json({ error: "variableCostPerContractYen must be a non-negative integer" }, { status: 400 });
  }

  const row = await ensureSalesConfig();
  const updated = await prisma.salesConfig.update({
    where: { id: row.id },
    data: {
      defaultRevenuePerContractYen: defRev,
      monthlyFixedExpenseYen: fixed,
      variableCostPerContractYen: variable,
    },
  });

  return NextResponse.json({
    defaultRevenuePerContractYen: updated.defaultRevenuePerContractYen,
    monthlyFixedExpenseYen: updated.monthlyFixedExpenseYen,
    variableCostPerContractYen: updated.variableCostPerContractYen,
  });
}
