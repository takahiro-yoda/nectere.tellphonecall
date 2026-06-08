import { NextRequest, NextResponse } from "next/server";
import {
  setMonthTargetAndDistribute,
  setWeekTargetAndSyncMonth,
  setWeekManualActual,
  setMonthManualActual,
  setActualDisplaySource,
  type KpiActualDisplaySource,
} from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const kpiId = typeof body.kpiDefinitionId === "string" ? body.kpiDefinitionId : "";
    const mode = body.mode;

    if (!kpiId) {
      return NextResponse.json({ error: "kpiDefinitionId is required" }, { status: 400 });
    }

    if (mode === "month") {
    const monthPeriod = typeof body.monthPeriod === "string" ? body.monthPeriod.trim() : "";
    const target =
      typeof body.target === "number"
        ? body.target
        : parseFloat(String(body.target ?? ""));

    if (!/^\d{4}-\d{2}$/.test(monthPeriod) || Number.isNaN(target) || target < 0) {
      return NextResponse.json({ error: "invalid month parameters" }, { status: 400 });
    }

    const data = await setMonthTargetAndDistribute(kpiId, monthPeriod, target);
    if (!data) return NextResponse.json({ error: "failed" }, { status: 400 });
    return NextResponse.json(data);
  }

  if (mode === "week") {
    const monthPeriod = typeof body.monthPeriod === "string" ? body.monthPeriod.trim() : "";
    const weekPeriod = typeof body.weekPeriod === "string" ? body.weekPeriod.trim() : "";
    const target =
      typeof body.target === "number"
        ? body.target
        : parseFloat(String(body.target ?? ""));

    if (
      !/^\d{4}-\d{2}$/.test(monthPeriod) ||
      !/^\d{4}-W\d{2}$/.test(weekPeriod) ||
      Number.isNaN(target) ||
      target < 0
    ) {
      return NextResponse.json({ error: "invalid week parameters" }, { status: 400 });
    }

    const data = await setWeekTargetAndSyncMonth(kpiId, monthPeriod, weekPeriod, target);
    if (!data) return NextResponse.json({ error: "failed" }, { status: 400 });
    return NextResponse.json(data);
  }

  if (mode === "weekActual") {
    const monthPeriod = typeof body.monthPeriod === "string" ? body.monthPeriod.trim() : "";
    const weekPeriod = typeof body.weekPeriod === "string" ? body.weekPeriod.trim() : "";
    const raw = body.value;
    const value =
      raw === null || raw === ""
        ? null
        : typeof raw === "number"
          ? raw
          : parseFloat(String(raw));

    if (!/^\d{4}-\d{2}$/.test(monthPeriod) || !/^\d{4}-W\d{2}$/.test(weekPeriod)) {
      return NextResponse.json({ error: "invalid parameters" }, { status: 400 });
    }
    if (value != null && (Number.isNaN(value) || value < 0)) {
      return NextResponse.json({ error: "invalid value" }, { status: 400 });
    }

    const data = await setWeekManualActual(kpiId, monthPeriod, weekPeriod, value);
    if (!data) return NextResponse.json({ error: "failed" }, { status: 400 });
    return NextResponse.json(data);
  }

  if (mode === "monthActual") {
    const monthPeriod = typeof body.monthPeriod === "string" ? body.monthPeriod.trim() : "";
    const raw = body.value;
    const value =
      raw === null || raw === ""
        ? null
        : typeof raw === "number"
          ? raw
          : parseFloat(String(raw));

    if (!/^\d{4}-\d{2}$/.test(monthPeriod)) {
      return NextResponse.json({ error: "invalid parameters" }, { status: 400 });
    }
    if (value != null && (Number.isNaN(value) || value < 0)) {
      return NextResponse.json({ error: "invalid value" }, { status: 400 });
    }

    const data = await setMonthManualActual(kpiId, monthPeriod, value);
    if (!data) return NextResponse.json({ error: "failed" }, { status: 400 });
    return NextResponse.json(data);
  }

  if (mode === "actualDisplaySource") {
    const monthPeriod = typeof body.monthPeriod === "string" ? body.monthPeriod.trim() : "";
    const source: KpiActualDisplaySource =
      body.source === "month_manual" ? "month_manual" : "week_sum";

    if (!/^\d{4}-\d{2}$/.test(monthPeriod)) {
      return NextResponse.json({ error: "invalid parameters" }, { status: 400 });
    }

    const data = await setActualDisplaySource(kpiId, monthPeriod, source);
    if (!data) return NextResponse.json({ error: "failed" }, { status: 400 });
    return NextResponse.json(data);
  }

    return NextResponse.json({ error: "unknown mode" }, { status: 400 });
  } catch (err) {
    console.error("[api/kpi/targets]", err);
    return NextResponse.json(
      { error: "サーバーエラー。開発サーバーを再起動してください（npx prisma generate 後）。" },
      { status: 500 }
    );
  }
}
