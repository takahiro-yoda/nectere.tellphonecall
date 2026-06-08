import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const kpiDefinitionId =
    typeof body.kpiDefinitionId === "string" ? body.kpiDefinitionId : "";
  const periodType = body.periodType === "month" ? "month" : body.periodType === "week" ? "week" : null;
  const period = typeof body.period === "string" ? body.period.trim() : "";
  const field = body.field === "manualActual" ? "manualActual" : "targetValue";

  if (!kpiDefinitionId || !periodType || !period) {
    return NextResponse.json({ error: "invalid parameters" }, { status: 400 });
  }

  const periodValid =
    periodType === "week" ? /^\d{4}-W\d{2}$/.test(period) : /^\d{4}-\d{2}$/.test(period);
  if (!periodValid) {
    return NextResponse.json({ error: "invalid period format" }, { status: 400 });
  }

  const kpi = await prisma.kpiDefinition.findUnique({ where: { id: kpiDefinitionId } });
  if (!kpi) {
    return NextResponse.json({ error: "kpi not found" }, { status: 404 });
  }

  if (field === "manualActual" && kpi.dataSource !== "MANUAL") {
    return NextResponse.json({ error: "manual actual only for MANUAL kpis" }, { status: 400 });
  }

  const rawValue = body.value;
  const value =
    rawValue === null || rawValue === ""
      ? field === "manualActual"
        ? null
        : 0
      : typeof rawValue === "number"
        ? rawValue
        : parseFloat(String(rawValue));

  if (value != null && (Number.isNaN(value) || value < 0)) {
    return NextResponse.json({ error: "invalid value" }, { status: 400 });
  }

  const createData = {
    kpiDefinitionId,
    periodType,
    period,
    targetValue: field === "targetValue" ? (value ?? 0) : 0,
    manualActual: field === "manualActual" ? value : null,
  };

  const existing = await prisma.kpiPeriodValue.findUnique({
    where: {
      kpiDefinitionId_periodType_period: { kpiDefinitionId, periodType, period },
    },
  });

  if (existing) {
    const updateData =
      field === "targetValue"
        ? { targetValue: value ?? 0 }
        : { manualActual: value };
    await prisma.kpiPeriodValue.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    await prisma.kpiPeriodValue.create({ data: createData });
  }

  return NextResponse.json({ ok: true });
}
