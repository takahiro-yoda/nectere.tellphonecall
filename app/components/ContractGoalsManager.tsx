"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type WeekGoal = {
  period: string;
  label: string;
  isCurrent: boolean;
  value: number | null;
};

type MonthRow = {
  period: string;
  label: string;
  isCurrent: boolean;
  goal: number | null;
  additionalFixedExpenseYen: number;
};

export function ContractGoalsManager() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<WeekGoal[]>([]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [draftGoal, setDraftGoal] = useState<Record<string, string>>({});
  const [draftExtra, setDraftExtra] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState<string | null>(null);
  const [savingMonthRow, setSavingMonthRow] = useState<string | null>(null);
  const [savingAllMonths, setSavingAllMonths] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const fetchWeeks = useCallback(async () => {
    const res = await fetch("/api/contract-goals/weeks");
    const data = await res.json();
    setWeeks(Array.isArray(data) ? data : []);
    setDraftValues({});
  }, []);

  const fetchMonths = useCallback(async (y: number) => {
    setLoadingMonths(true);
    setMonthRows([]);
    try {
      const res = await fetch(`/api/contract-goals/months?year=${y}`);
      const data = await res.json();
      const rows: MonthRow[] = Array.isArray(data.months) ? data.months : [];
      setMonthRows(rows);
      const dg: Record<string, string> = {};
      const de: Record<string, string> = {};
      for (const m of rows) {
        dg[m.period] = m.goal != null ? String(m.goal) : "";
        de[m.period] = String(m.additionalFixedExpenseYen ?? 0);
      }
      setDraftGoal(dg);
      setDraftExtra(de);
    } finally {
      setLoadingMonths(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeks().finally(() => setLoading(false));
  }, [fetchWeeks]);

  useEffect(() => {
    void fetchMonths(year);
  }, [fetchMonths, year]);

  async function saveWeek(period: string, value: string) {
    const num = value === "" ? 0 : parseInt(value, 10);
    if (Number.isNaN(num) || num < 0) return;
    setSavingPeriod(period);
    try {
      const res = await fetch("/api/contract-goals", {
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

  async function saveMonthRow(period: string) {
    const gRaw = draftGoal[period] ?? "";
    const eRaw = draftExtra[period] ?? "0";
    const goal = gRaw === "" ? 0 : parseInt(gRaw, 10);
    const extra = parseInt(eRaw, 10);
    if (Number.isNaN(goal) || goal < 0 || Number.isNaN(extra) || extra < 0) return;
    setSavingMonthRow(period);
    try {
      const res = await fetch("/api/contract-goals/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, goal, additionalFixedExpenseYen: extra }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchMonths(year);
      router.refresh();
      window.dispatchEvent(new CustomEvent("contract-target-period-saved", { detail: { period } }));
    } finally {
      setSavingMonthRow(null);
    }
  }

  async function saveAllMonths() {
    if (monthRows.length === 0) return;
    setSavingAllMonths(true);
    try {
      await Promise.all(
        monthRows.map(async (m) => {
          const gRaw = draftGoal[m.period] ?? "";
          const eRaw = draftExtra[m.period] ?? "0";
          const goal = gRaw === "" ? 0 : parseInt(gRaw, 10);
          const extra = parseInt(eRaw, 10);
          if (Number.isNaN(goal) || goal < 0 || Number.isNaN(extra) || extra < 0) return;

          await fetch("/api/contract-goals/months", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ period: m.period, goal, additionalFixedExpenseYen: extra }),
          });
        }),
      );
      await fetchMonths(year);
      router.refresh();
    } finally {
      setSavingAllMonths(false);
    }
  }

  function setDraft(period: string, v: string) {
    setDraftValues((prev) => ({ ...prev, [period]: v }));
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-zinc-500">読み込み中…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">契約目標</h2>
      <p className="mt-1 text-sm text-zinc-500">週ごとの目標と、年別の「1月〜12月」の契約目標・月ごとの経費をまとめて設定します。</p>

      <div className="mt-6">
        <h3 className="text-base font-medium text-zinc-800">週の目標</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 font-semibold text-zinc-700">期間</th>
                <th className="w-28 px-4 py-3 font-semibold text-zinc-700">目標（件）</th>
                <th className="w-20 px-4 py-3" />
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

      <div className="mt-8 border-t border-zinc-200 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-base font-medium text-zinc-800">月の目標・月ごとの経費</h3>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              左の試算用「月次固定経費」はそのままです。ここでは
              <strong className="font-medium text-zinc-700"> 月ごとに上乗せする経費</strong>
              （キャンペーン広告など）を入れられます。未入力の契約目標は保存時に 0 件として記録されます。
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            表示する年
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}年（1月〜12月）
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={saveAllMonths}
            disabled={loadingMonths || savingAllMonths || savingMonthRow !== null}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {savingAllMonths ? "全月保存中…" : "全月をまとめて保存"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 font-semibold text-zinc-700">月</th>
                <th className="w-28 px-4 py-3 font-semibold text-zinc-700">契約目標（件）</th>
                <th className="min-w-[9rem] px-4 py-3 font-semibold text-zinc-700">月の経費（円）</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loadingMonths && monthRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                    読み込み中…
                  </td>
                </tr>
              ) : (
                monthRows.map((m) => (
                  <tr
                    key={m.period}
                    className={`border-b border-zinc-100 ${m.isCurrent ? "bg-amber-50/40" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">{m.label}</span>
                      {m.isCurrent && <span className="ml-2 text-xs font-semibold text-amber-700">今月</span>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        value={draftGoal[m.period] ?? ""}
                        onChange={(e) => setDraftGoal((p) => ({ ...p, [m.period]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          void saveMonthRow(m.period);
                        }}
                        placeholder="0"
                        className="w-full max-w-28 rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={draftExtra[m.period] ?? "0"}
                        onChange={(e) => setDraftExtra((p) => ({ ...p, [m.period]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          void saveMonthRow(m.period);
                        }}
                        className="w-full max-w-36 rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-[11px] leading-snug text-zinc-400">共通固定に加算</p>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => saveMonthRow(m.period)}
                        disabled={savingMonthRow === m.period || loadingMonths}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {savingMonthRow === m.period ? "保存中…" : "保存"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
