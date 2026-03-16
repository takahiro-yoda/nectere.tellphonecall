"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type WeekGoal = {
  period: string;
  label: string;
  isCurrent: boolean;
  value: number | null;
};

export function GoalsManager() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<WeekGoal[]>([]);
  const [monthValue, setMonthValue] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [savingPeriod, setSavingPeriod] = useState<string | null>(null);
  const [savingMonth, setSavingMonth] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  async function fetchWeeks() {
    const res = await fetch("/api/goals/weeks");
    const data = await res.json();
    setWeeks(Array.isArray(data) ? data : []);
    setDraftValues({});
  }

  async function fetchMonth() {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setMonthValue(data.month ?? "");
  }

  useEffect(() => {
    Promise.all([fetchWeeks(), fetchMonth()]).finally(() => setLoading(false));
  }, []);

  async function saveWeek(period: string, value: string) {
    const num = value === "" ? 0 : parseInt(value, 10);
    if (Number.isNaN(num) || num < 0) return;
    setSavingPeriod(period);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, value: num }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchWeeks();
      router.refresh();
    } finally {
      setSavingPeriod(null);
    }
  }

  async function saveMonth() {
    const num = monthValue === "" ? 0 : Number(monthValue);
    if (Number.isNaN(num) || num < 0) return;
    setSavingMonth(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: num }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchMonth();
      router.refresh();
    } finally {
      setSavingMonth(false);
    }
  }

  function setDraft(period: string, v: string) {
    setDraftValues((prev) => ({ ...prev, [period]: v }));
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-zinc-500">読み込み中…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">目標設定</h2>
      <p className="mt-1 text-sm text-zinc-500">週・月ごとの架電目標（件）を設定します。ダッシュボードの「あと何件」に反映されます。</p>

      {/* 週の目標 */}
      <div className="mt-6">
        <h3 className="text-base font-medium text-zinc-800">週の目標</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 font-semibold text-zinc-700">期間</th>
                <th className="px-4 py-3 font-semibold text-zinc-700 w-28">目標（件）</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const displayVal =
                  draftValues[w.period] !== undefined ? draftValues[w.period] : String(w.value ?? "");
                return (
                  <tr key={w.period} className={`border-b border-zinc-100 ${w.isCurrent ? "bg-blue-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">
                        {w.label}
                        {w.isCurrent && <span className="ml-1.5 text-xs text-blue-600">今週</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        value={displayVal}
                        onChange={(e) => setDraft(w.period, e.target.value)}
                        className="w-full max-w-24 rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => saveWeek(w.period, displayVal)}
                        disabled={savingPeriod === w.period}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {savingPeriod === w.period ? "保存中…" : "保存"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 月の目標 */}
      <div className="mt-6 pt-6 border-t border-zinc-200">
        <h3 className="text-base font-medium text-zinc-800">月の目標（今月）</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={0}
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-24 rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-zinc-600">件</span>
          <button
            type="button"
            onClick={saveMonth}
            disabled={savingMonth}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {savingMonth ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </section>
  );
}
