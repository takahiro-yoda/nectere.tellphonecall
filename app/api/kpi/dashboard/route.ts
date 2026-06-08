import { NextRequest, NextResponse } from "next/server";
import { getKpiDashboard } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const periodTypeParam = request.nextUrl.searchParams.get("periodType");
  const periodType = periodTypeParam === "month" ? "month" : periodTypeParam === "week" ? "week" : null;
  const period = request.nextUrl.searchParams.get("period")?.trim() ?? "";

  if (!periodType || !period) {
    return NextResponse.json({ error: "periodType and period are required" }, { status: 400 });
  }

  const items = await getKpiDashboard(periodType, period);
  return NextResponse.json({ items, periodType, period });
}
