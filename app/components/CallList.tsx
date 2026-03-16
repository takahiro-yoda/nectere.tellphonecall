"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EditCallModal } from "./EditCallModal";
import type { ViewPeriod } from "@/lib/dateUtils";

const VIEW_TO_RANGE: Record<ViewPeriod, string> = {
  "this-week": "week",
  "last-week": "last-week",
  "this-month": "month",
  "last-month": "last-month",
};

type Call = {
  id: string;
  destination: string;
  memo: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string; color: string | null } | null;
  isAppointment: boolean;
  createdAt: string;
  status?: "APPOINTMENT" | "NO_ANSWER" | "OTHER";
};

type RangeKey = "week" | "last-week" | "month" | "last-month";

type Props = {
  onOpenChange?: (open: boolean) => void;
  defaultView?: ViewPeriod;
  customFrom?: string;
  customTo?: string;
  /**  true のときは開閉ボタンを出さず一覧を常に表示（右サイドバー用） */
  alwaysOpen?: boolean;
};

export function CallList({
  onOpenChange,
  defaultView = "this-week",
  customFrom,
  customTo,
  alwaysOpen = false,
}: Props) {
  const isCustomRange = Boolean(customFrom && customTo);
  const [open, setOpen] = useState(alwaysOpen);
  const [range, setRange] = useState<RangeKey>(VIEW_TO_RANGE[defaultView] as RangeKey);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCall, setEditingCall] = useState<Call | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const filteredCalls = searchQuery.trim()
    ? calls.filter((call) => {
        const q = searchQuery.trim().toLowerCase();
        const dest = call.destination.toLowerCase();
        const assigneeName = call.assignee?.name.toLowerCase() ?? "";
        const memo = (call.memo ?? "").toLowerCase();
        return dest.includes(q) || assigneeName.includes(q) || memo.includes(q);
      })
    : calls;

  async function handleDelete(call: Call) {
    if (!confirm(`「${call.destination}」の架電記録を削除しますか？`)) return;
    try {
      const res = await fetch(`/api/calls/${call.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setCalls((prev) => prev.filter((c) => c.id !== call.id));
      router.refresh();
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!isCustomRange) setRange(VIEW_TO_RANGE[defaultView] as RangeKey);
  }, [defaultView, isCustomRange]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open && !alwaysOpen) return;
    setLoading(true);
    const url = isCustomRange
      ? `/api/calls?range=custom&from=${encodeURIComponent(customFrom!)}&to=${encodeURIComponent(customTo!)}`
      : `/api/calls?range=${range}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setCalls(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [open, alwaysOpen, range, editingCall, isCustomRange, customFrom, customTo]);

  function toggle() {
    setOpen((o) => !o);
  }

  const showList = open || alwaysOpen;

  return (
    <div className={alwaysOpen ? "flex h-full min-h-0 flex-col" : "w-full"}>
      {!alwaysOpen && (
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          {open ? "電話先一覧を閉じる" : "電話先一覧を表示"}
        </button>
      )}
      {alwaysOpen && (
        <h2 className="mb-3 text-base font-semibold text-zinc-800">電話先一覧</h2>
      )}
      {showList && (
        <div
          className={
            alwaysOpen
              ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
              : "mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          }
        >
          {isCustomRange ? (
            <div className="border-b border-zinc-200 bg-zinc-50/80 px-4 py-3.5 text-sm font-medium text-zinc-700">
              指定期間（{customFrom} 〜 {customTo}）
            </div>
          ) : (
            <div className="flex border-b border-zinc-200 bg-zinc-50/80">
              {(["week", "last-week", "month", "last-month"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`flex-1 px-3 py-3.5 text-sm font-medium transition ${
                    range === r
                      ? "border-b-2 border-zinc-900 text-zinc-900 bg-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50"
                  }`}
                >
                  {r === "week" ? "今週" : r === "last-week" ? "先週" : r === "month" ? "今月" : "先月"}
                </button>
              ))}
            </div>
          )}
          {!loading && calls.length > 0 && (
            <div className="border-b border-zinc-200 px-4 py-3">
              <label htmlFor="call-list-search" className="sr-only">
                名前で検索
              </label>
              <input
                id="call-list-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="電話先・担当者・メモで検索…"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              {searchQuery.trim() && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  {filteredCalls.length}件
                  {filteredCalls.length !== calls.length && `（全${calls.length}件中）`}
                </p>
              )}
            </div>
          )}
          {loading ? (
            <div className="p-10 text-center text-zinc-500">読み込み中…</div>
          ) : calls.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">
              {isCustomRange
                ? "指定期間の架電はありません。"
                : `${range === "week" ? "今週" : range === "last-week" ? "先週" : range === "month" ? "今月" : "先月"}の架電はまだありません。`}
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">
              「{searchQuery.trim()}」に一致する架電はありません。
            </div>
          ) : (
            <div className={alwaysOpen ? "flex-1 overflow-auto overflow-x-auto" : "overflow-x-auto"}>
              <table className="w-full min-w-[320px] text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      日時
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      担当
                    </th>
                    <th className="min-w-[140px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      電話先
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      アポ
                    </th>
                    <th className="min-w-[160px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      メモ
                    </th>
                    <th className="w-0 px-3 py-3.5"></th>
                    <th className="w-0 px-3 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call, i) => (
                    <tr
                      key={call.id}
                      className={`border-b border-zinc-100 transition-colors hover:bg-zinc-50/70 ${
                        i % 2 === 1 ? "bg-zinc-50/40" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-zinc-500">
                        <span className="block font-medium text-zinc-700">
                          {new Date(call.createdAt).toLocaleDateString("ja-JP", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-xs">
                          {new Date(call.createdAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {call.assignee ? (
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: call.assignee.color ? `${call.assignee.color}22` : "#e4e4e7",
                              color: call.assignee.color || "#52525b",
                            }}
                          >
                            {call.assignee.name}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-base font-semibold text-zinc-900">
                          {call.destination}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {call.status === "APPOINTMENT" || call.isAppointment ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            アポ
                          </span>
                        ) : call.status === "NO_ANSWER" ? (
                          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                            未応答
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                            通話のみ
                          </span>
                        )}
                      </td>
                      <td className="max-w-[220px] px-5 py-4">
                        <span
                          className="block text-sm leading-relaxed text-zinc-600"
                          title={call.memo ?? undefined}
                        >
                          {call.memo ? (
                            <span className="line-clamp-2">{call.memo}</span>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => setEditingCall(call)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-200/80 hover:text-zinc-700"
                          title="編集"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => handleDelete(call)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-red-100 hover:text-red-600"
                          title="削除"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {editingCall && (
        <EditCallModal call={editingCall} onClose={() => setEditingCall(null)} />
      )}
    </div>
  );
}
