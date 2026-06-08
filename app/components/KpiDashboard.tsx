"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { KpiDashboardItem } from "@/lib/kpi";
import type { ViewPeriod } from "@/lib/dateUtils";
import { PeriodSelector } from "./PeriodSelector";
import { KpiCard } from "./KpiCard";
import { KpiAchievementChart } from "./KpiAchievementChart";

type KpiDashboardProps = {
  initialItems: KpiDashboardItem[];
  initialPeriodType: "week" | "month";
  initialPeriod: string;
  initialLabel: string;
};

const VIEWS: ViewPeriod[] = ["this-week", "last-week", "this-month", "last-month"];

function KpiDashboardInner({
  initialItems,
  initialPeriodType,
  initialPeriod,
  initialLabel,
}: KpiDashboardProps) {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") || "this-week";
  const view: ViewPeriod =
    VIEWS.includes(viewParam as ViewPeriod) ? (viewParam as ViewPeriod) : "this-week";

  const [items, setItems] = useState(initialItems);
  const [periodLabel, setPeriodLabel] = useState(initialLabel);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isDefaultView = view === "this-week" && !searchParams.get("view");
    if (isDefaultView) {
      setItems(initialItems);
      setPeriodLabel(initialLabel);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/kpi/dashboard-by-view?view=${encodeURIComponent(view)}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setPeriodLabel(data.label ?? "");
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [view, initialItems, initialLabel, searchParams]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">KPIダッシュボード</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {periodLabel ? `${periodLabel}の目標と実績` : "期間を選択してください"}
          </p>
        </div>
        <PeriodSelector />
      </div>

      {loading ? (
        <p className="mt-8 text-center text-zinc-500">読み込み中…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-600">KPIがまだありません。</p>
          <p className="mt-1 text-sm text-zinc-500">下の「KPI設定」から追加するか、テンプレートから作成してください。</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <KpiCard key={item.id} item={item} />
            ))}
          </div>
          <KpiAchievementChart items={items} />
        </>
      )}
    </section>
  );
}

export function KpiDashboard(props: KpiDashboardProps) {
  return (
    <Suspense
      fallback={
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-zinc-500">読み込み中…</p>
        </section>
      }
    >
      <KpiDashboardInner {...props} />
    </Suspense>
  );
}
