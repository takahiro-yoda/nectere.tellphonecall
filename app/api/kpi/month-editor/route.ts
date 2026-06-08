import { NextRequest, NextResponse } from "next/server";
import { getKpiMonthEditorData } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const kpiId = request.nextUrl.searchParams.get("kpiId")?.trim() ?? "";
  const monthPeriod = request.nextUrl.searchParams.get("monthPeriod")?.trim() ?? "";

  if (!kpiId || !/^\d{4}-\d{2}$/.test(monthPeriod)) {
    return NextResponse.json({ error: "kpiId and monthPeriod (YYYY-MM) are required" }, { status: 400 });
  }

  const data = await getKpiMonthEditorData(kpiId, monthPeriod);
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
