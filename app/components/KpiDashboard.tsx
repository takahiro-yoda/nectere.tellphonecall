"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { KpiDashboardItem } from "@/lib/kpi";
import type { KpiTagLite } from "@/lib/kpiTags";
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
  const [searchQ, setSearchQ] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<KpiTagLite[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kpi/tags")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: KpiTagLite[] }) => {
        if (!cancelled) setAllTags(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setAllTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    let result = items;
    const q = searchQ.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }
    if (selectedTagIds.size > 0) {
      result = result.filter((item) =>
        (item.tags ?? []).some((t) => selectedTagIds.has(t.id)),
      );
    }
    return result;
  }, [items, searchQ, selectedTagIds]);

  const hasActiveFilters = searchQ.trim().length > 0 || selectedTagIds.size > 0;

  function toggleTagFilter(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  function clearFilters() {
    setSearchQ("");
    setSelectedTagIds(new Set());
  }

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

      {items.length > 0 ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="kpi-dashboard-search" className="block text-xs font-medium text-zinc-600">
                キーワード
              </label>
              <input
                id="kpi-dashboard-search"
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="KPI名で検索…"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
          </div>
          {allTags.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-zinc-600">タグで絞り込み（複数選択可）</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const active = selectedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagFilter(tag.id)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-sky-200 bg-white text-sky-900 hover:bg-sky-50"
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {hasActiveFilters ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3">
              <span className="text-xs font-medium text-zinc-500">
                {filteredItems.length} / {items.length} 件
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900"
              >
                絞り込みをクリア
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-center text-zinc-500">読み込み中…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-600">KPIがまだありません。</p>
          <p className="mt-1 text-sm text-zinc-500">下の「KPI設定」から追加するか、テンプレートから作成してください。</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-600">条件に一致するKPIがありません。</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-sm font-medium text-sky-700 underline hover:text-sky-900"
          >
            絞り込みをクリア
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <KpiCard key={item.id} item={item} />
            ))}
          </div>
          <KpiAchievementChart items={filteredItems} />
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
