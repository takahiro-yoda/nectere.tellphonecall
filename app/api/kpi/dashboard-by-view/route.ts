import { NextRequest, NextResponse } from "next/server";
import type { ViewPeriod } from "@/lib/dateUtils";
import { getRangeForView } from "@/lib/dateUtils";
import { getKpiDashboard, getPeriodFromView } from "@/lib/kpi";

export const dynamic = "force-dynamic";

const VIEWS: ViewPeriod[] = ["this-week", "last-week", "this-month", "last-month"];

export async function GET(request: NextRequest) {
  const viewParam = request.nextUrl.searchParams.get("view") ?? "this-week";
  const view: ViewPeriod = VIEWS.includes(viewParam as ViewPeriod)
    ? (viewParam as ViewPeriod)
    : "this-week";

  const { periodType, period } = getPeriodFromView(view);
  const range = getRangeForView(view);
  const items = await getKpiDashboard(periodType, period);

  return NextResponse.json({
    items,
    periodType,
    period,
    label: range.label,
  });
}
