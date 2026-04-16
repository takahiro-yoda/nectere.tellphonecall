"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HamburgerMenu } from "@/app/components/HamburgerMenu";

function formatMonthValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function monthToFromTo(monthValue: string): { from: string; to: string } | null {
  const m = monthValue.trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  const [yyyyStr, mmStr] = m.split("-");
  const yyyy = Number(yyyyStr);
  const mm = Number(mmStr);
  if (!yyyy || !mm || mm < 1 || mm > 12) return null;
  const start = new Date(yyyy, mm - 1, 1);
  const end = new Date(yyyy, mm, 0);
  const from = `${yyyy}-${String(mm).padStart(2, "0")}-01`;
  const to = `${yyyy}-${String(mm).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { from, to };
}

type ViewKey = "all" | "day" | "week" | "month" | "year" | "custom";
type CallRow = {
  id: string;
  destination: string;
  destinationContactName?: string | null;
  destinationPhone?: string | null;
  memo: string | null;
  assignee: { id: string; name: string; color: string | null } | null;
  callType: { id: string; name: string } | null;
  createdAt: string;
  status?: "APPOINTMENT" | "NO_ANSWER" | "OTHER" | "SKIPPED";
};

export default function CallsHistoryPage() {
  const [view, setView] = useState<ViewKey>("month");
  const [month, setMonth] = useState(() => formatMonthValue(new Date()));
  const [day, setDay] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [customFrom, setCustomFrom] = useState(() => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`);
  const [customTo, setCustomTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [pageSize, setPageSize] = useState<50 | 100>(50);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CallRow[]>([]);
  const [total, setTotal] = useState(0);

  const fromTo = useMemo(() => monthToFromTo(month), [month]);
  const pageCount = useMemo(() => (total === 0 ? 1 : Math.ceil(total / pageSize)), [total, pageSize]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter((row) => {
      const dest = row.destination.toLowerCase();
      const contact = (row.destinationContactName ?? "").toLowerCase();
      const phone = (row.destinationPhone ?? "").toLowerCase();
      const memo = (row.memo ?? "").toLowerCase();
      const assignee = (row.assignee?.name ?? "").toLowerCase();
      const callType = (row.callType?.name ?? "").toLowerCase();
      return dest.includes(q) || contact.includes(q) || phone.includes(q) || memo.includes(q) || assignee.includes(q) || callType.includes(q);
    });
  }, [items, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [view, month, day, year, customFrom, customTo, pageSize]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("view", view);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (view === "day") params.set("day", day);
        if (view === "year") params.set("year", year);
        if (view === "custom") {
          params.set("from", customFrom);
          params.set("to", customTo);
        }
        if (view === "month") {
          const r = fromTo;
          if (r) {
            params.set("view", "custom");
            params.set("from", r.from);
            params.set("to", r.to);
          } else {
            params.set("view", "month");
          }
        }
        const res = await fetch(`/api/calls/paged?${params.toString()}`);
        if (!res.ok) throw new Error(`status: ${res.status}`);
        const data = (await res.json()) as { items?: CallRow[]; total?: number };
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      } catch {
        setItems([]);
        setTotal(0);
        setError("読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [view, page, pageSize, day, year, customFrom, customTo, fromTo]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">通話履歴一覧</h1>
              <p className="text-xs font-medium text-zinc-400">過去の架電履歴をまとめて確認</p>
            </div>
          </div>
          <Link
            href="/calls"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr,auto] sm:items-end">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="history-view" className="block text-sm font-medium text-zinc-700">
                表示
              </label>
              <select
                id="history-view"
                value={view}
                onChange={(e) => setView(e.target.value as ViewKey)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                <option value="month">月</option>
                <option value="week">週（今週）</option>
                <option value="day">日</option>
                <option value="year">年間</option>
                <option value="all">すべて</option>
                <option value="custom">期間指定</option>
              </select>
            </div>

            {view === "month" && (
              <div>
                <label htmlFor="history-month" className="block text-sm font-medium text-zinc-700">
                  月
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="history-month"
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setMonth(formatMonthValue(new Date()))}
                    className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    今月
                  </button>
                </div>
              </div>
            )}

            {view === "day" && (
              <div>
                <label htmlFor="history-day" className="block text-sm font-medium text-zinc-700">
                  日付
                </label>
                <input
                  id="history-day"
                  type="date"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
            )}

            {view === "year" && (
              <div>
                <label htmlFor="history-year" className="block text-sm font-medium text-zinc-700">
                  年
                </label>
                <input
                  id="history-year"
                  inputMode="numeric"
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, ""))}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  placeholder="例: 2026"
                />
              </div>
            )}

            {view === "custom" && (
              <>
                <div>
                  <label htmlFor="history-from" className="block text-sm font-medium text-zinc-700">
                    開始日
                  </label>
                  <input
                    id="history-from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                </div>
                <div>
                  <label htmlFor="history-to" className="block text-sm font-medium text-zinc-700">
                    終了日
                  </label>
                  <input
                    id="history-to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="history-page-size" className="block text-sm font-medium text-zinc-700">
                表示件数
              </label>
              <select
                id="history-page-size"
                value={pageSize}
                onChange={(e) => setPageSize((e.target.value === "100" ? 100 : 50) as 50 | 100)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="history-search" className="block text-sm font-medium text-zinc-700">
                検索
              </label>
              <input
                id="history-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="電話先・担当者名・電話番号・社内担当・メモ・通話タイプで検索…"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              前へ
            </button>
            <div className="text-sm font-medium text-zinc-700">
              {page}/{pageCount}
              <span className="ml-2 text-xs text-zinc-500">全{total}件</span>
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount || loading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {error && <div className="border-b border-zinc-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="p-10 text-center text-zinc-500">読み込み中…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">該当データがありません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">日時</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">担当</th>
                    <th className="min-w-[180px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">電話先</th>
                    <th className="min-w-[160px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">詳細情報</th>
                    <th className="min-w-[180px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => (window.location.href = `/calls/${row.id}/flow`)}
                      className={`cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50/70 ${
                        idx % 2 === 1 ? "bg-zinc-50/40" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-zinc-500">
                        <span className="block font-medium text-zinc-700">
                          {new Date(row.createdAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-xs">
                          {new Date(row.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {row.assignee ? (
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: row.assignee.color ? `${row.assignee.color}22` : "#e4e4e7",
                              color: row.assignee.color || "#52525b",
                            }}
                          >
                            {row.assignee.name}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-base font-semibold text-zinc-900 underline-offset-2 transition hover:text-zinc-700 hover:underline">
                          {row.destination}
                        </span>
                        {row.callType?.name && <div className="mt-0.5 text-[11px] font-medium text-zinc-500">{row.callType.name}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-sm text-zinc-700">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-zinc-500">担当者名</div>
                            <div className="truncate font-medium text-zinc-800">{row.destinationContactName?.trim() || "—"}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-zinc-500">電話番号</div>
                            <div className="truncate font-medium text-zinc-800">{row.destinationPhone?.trim() || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[260px] px-5 py-4">
                        <span className="block text-sm leading-relaxed text-zinc-600" title={row.memo ?? undefined}>
                          {row.memo ? <span className="line-clamp-2">{row.memo}</span> : <span className="text-zinc-300">—</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

