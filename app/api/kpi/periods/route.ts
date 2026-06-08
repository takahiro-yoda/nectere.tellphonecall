import { NextRequest, NextResponse } from "next/server";
import { getKpiPeriodRows } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const kpiId = request.nextUrl.searchParams.get("kpiId")?.trim() ?? "";
  const periodTypeParam = request.nextUrl.searchParams.get("periodType");
  const periodType = periodTypeParam === "month" ? "month" : periodTypeParam === "week" ? "week" : null;
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : undefined;

  if (!kpiId || !periodType) {
    return NextResponse.json({ error: "kpiId and periodType are required" }, { status: 400 });
  }

  const rows = await getKpiPeriodRows(kpiId, periodType, Number.isFinite(year) ? year : undefined);
  return NextResponse.json({ rows });
}
