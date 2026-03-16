import Link from "next/link";
import { Suspense } from "react";
import { getCounts, getGoals, getStats, getPeriodStats, getStatsForDateRange, getDailyStats } from "@/lib/calls";
import type { ViewPeriod } from "@/lib/dateUtils";
import { parseCustomDateRange, getRangeForView } from "@/lib/dateUtils";
import { StatsHero } from "./components/StatsHero";
import { GoalRemain } from "./components/GoalRemain";
import { AddCallForm } from "./components/AddCallForm";
import { CallList } from "./components/CallList";
import { AppoRateBlock } from "./components/AppoRateBlock";
import { StatsCharts } from "./components/StatsCharts";
import { DailyChart } from "./components/DailyChart";
import { PeriodSelector } from "./components/PeriodSelector";

export const dynamic = "force-dynamic";

const VIEWS: ViewPeriod[] = ["this-week", "last-week", "this-month", "last-month"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; from?: string; to?: string }>;
}) {
  const { view: viewParam, from: fromParam, to: toParam } = await searchParams;
  const isCustom = viewParam === "custom" && fromParam != null && toParam != null;
  const customRange = isCustom ? parseCustomDateRange(fromParam, toParam) : null;

  const view: ViewPeriod =
    viewParam && VIEWS.includes(viewParam as ViewPeriod) ? (viewParam as ViewPeriod) : "this-week";

  const displayRange = customRange
    ? { start: customRange.start, end: customRange.end }
    : getRangeForView(view);

  const [counts, goals, stats, displayStats, dailyStats] = await Promise.all([
    getCounts(),
    getGoals(),
    getStats(),
    customRange
      ? getStatsForDateRange(customRange.start, customRange.end, customRange.label)
      : getPeriodStats(view),
    getDailyStats(displayRange.start, displayRange.end),
  ]);

  const displayLabel = displayStats.label;
  const customFromTo = customRange ? { from: fromParam!, to: toParam! } : null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-zinc-900">架電数ダッシュボード</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              管理・目標設定
            </Link>
            <AddCallForm />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <StatsHero
          weekCount={counts.weekCount}
          monthCount={counts.monthCount}
          weekGoal={goals.week}
          monthGoal={goals.month}
        />
        <div className="mt-6">
          <GoalRemain
            weekCount={counts.weekCount}
            monthCount={counts.monthCount}
            weekGoal={goals.week}
            monthGoal={goals.month}
          />
        </div>
        <div className="mt-8">
          <AppoRateBlock
            weekAppoRate={stats.weekAppoRate}
            monthAppoRate={stats.monthAppoRate}
            weekAppoCount={stats.weekAppoCount}
            monthAppoCount={stats.monthAppoCount}
            weekTotal={stats.weekTotal}
            monthTotal={stats.monthTotal}
          />
        </div>

        <div className="mt-10 border-t border-zinc-200 pt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-800">パフォーマンス</h2>
            <Suspense fallback={<div className="h-9 w-64 rounded-lg bg-zinc-200 animate-pulse" />}>
              <PeriodSelector />
            </Suspense>
          </div>
          <div className="mt-4 space-y-6">
            {dailyStats.length > 0 && (
              <DailyChart dailyStats={dailyStats} periodLabel={displayLabel} />
            )}
            <StatsCharts
              byAssignee={displayStats.byAssignee}
              periodLabel={displayLabel}
            />
          </div>
        </div>
        <div className="mt-8">
          <CallList defaultView={view} customFrom={customFromTo?.from} customTo={customFromTo?.to} />
        </div>
      </main>
    </div>
  );
}
