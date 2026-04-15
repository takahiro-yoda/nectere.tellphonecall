"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  ReferenceLine,
} from "recharts";

type MonthRow = {
  period: string;
  label: string;
  contractCount: number;
  revenueYen: number;
  fixedYen: number;
  variableYen: number;
  profitYen: number;
  usedPlanBreakdown: boolean;
  monthGoal: number | null;
  planBreakdown: {
    courseId: string;
    name: string;
    targetCount: number;
    revenueYen: number;
    variableYen: number;
  }[];
};

type YearSummary = {
  year: number;
  contractCount: number;
  revenueYen: number;
  fixedYen: number;
  variableYen: number;
  profitYen: number;
};

function formatYen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);
}

function legendLabel(value: string) {
  return <span className="text-zinc-700">{value}</span>;
}

export function ContractTrendsPanel() {
  const defaultYear = new Date().getFullYear();
  const [year, setYear] = useState(defaultYear);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [annual, setAnnual] = useState<YearSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPeriod, setOpenPeriod] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"summary" | "plans">("plans");

  const toggleOpenPeriod = useCallback((period: string | null) => {
    if (!period) return;
    setOpenPeriod((prev) => (prev === period ? null : period));
    setDetailTab("plans");
  }, []);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/contract-trends?year=${y}&annualSpan=5`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const nextMonths = Array.isArray(data.months) ? data.months : [];
      setMonths(nextMonths);
      setAnnual(Array.isArray(data.annual) ? data.annual : []);
      setOpenPeriod((prev) => prev ?? nextMonths[0]?.period ?? null);
      setDetailTab("plans");
    } catch {
      setError("データの取得に失敗しました");
      setMonths([]);
      setAnnual([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year);
  }, [year, load]);

  useEffect(() => {
    function onPeriodSaved(ev: Event) {
      const e = ev as CustomEvent<{ period?: string }>;
      const period = e.detail?.period;
      if (!period || !/^\d{4}-\d{2}$/.test(period)) return;
      const y = parseInt(period.slice(0, 4), 10);
      if (!Number.isFinite(y)) return;
      setYear(y);
      setOpenPeriod(period);
      setDetailTab("plans");
      void load(y);
    }
    window.addEventListener("contract-target-period-saved", onPeriodSaved as EventListener);
    return () => window.removeEventListener("contract-target-period-saved", onPeriodSaved as EventListener);
  }, [load]);

  const yearOptions = Array.from({ length: 7 }, (_, i) => defaultYear - 3 + i);

  const monthChartData = months.map((m) => ({
    ...m,
    revenueMan: Math.round(m.revenueYen / 10000),
    profitMan: Math.round(m.profitYen / 10000),
  }));
  const openMonth = months.find((m) => m.period === openPeriod) ?? null;

  const annualChartData = annual.map((a) => ({
    ...a,
    label: `${a.year}年`,
    revenueMan: Math.round(a.revenueYen / 10000),
    profitMan: Math.round(a.profitYen / 10000),
  }));

  const monthTotals = months.reduce(
    (acc, m) => ({
      contractCount: acc.contractCount + m.contractCount,
      revenueYen: acc.revenueYen + m.revenueYen,
      fixedYen: acc.fixedYen + m.fixedYen,
      variableYen: acc.variableYen + m.variableYen,
      profitYen: acc.profitYen + m.profitYen,
    }),
    {
      contractCount: 0,
      revenueYen: 0,
      fixedYen: 0,
      variableYen: 0,
      profitYen: 0,
    },
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">売上・契約・利益の推移</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            試算表の入力値から月次・年次の推移を算出します。月目標が入っている月はその値を優先し、未設定の月だけプラン別目標の合計を使います。固定費は共通固定費＋月別追加経費で計算します。
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          月次グラフの年
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">読み込み中…</p>
      ) : (
        <>
          <div className="mt-8">
            <h3 className="text-base font-medium text-zinc-800">月次（{year}年）</h3>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" />
                  <ReferenceLine yAxisId="yen" y={0} stroke="#6b7280" strokeDasharray="4 4" ifOverflow="extendDomain" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="yen"
                    tickFormatter={(v) => `${v}万`}
                    tick={{ fontSize: 11 }}
                    width={44}
                    label={{ value: "万円", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11 } }}
                  />
                  <YAxis
                    yAxisId="cnt"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    width={36}
                    allowDecimals={false}
                    label={{ value: "件", angle: 90, position: "insideRight", offset: 0, style: { fontSize: 11 } }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                    if (name === "目標件数") return [String(value ?? ""), String(name)];
                      const n = typeof value === "number" ? value * 10000 : 0;
                      return [formatYen(n), String(name)];
                    }}
                    labelFormatter={(l) => `${year}年 ${l}`}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7" }}
                  />
                  <Legend formatter={legendLabel} />
                  <Bar
                    yAxisId="yen"
                    dataKey="revenueMan"
                    name="売上（万円）"
                    fill="#7FA8A1"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    onClick={(d) => toggleOpenPeriod((d as { payload?: { period?: string } })?.payload?.period ?? null)}
                    className="cursor-pointer"
                  />
                  <Bar
                    yAxisId="yen"
                    dataKey="profitMan"
                    name="利益（万円）"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    onClick={(d) => toggleOpenPeriod((d as { payload?: { period?: string } })?.payload?.period ?? null)}
                    className="cursor-pointer"
                  >
                    {monthChartData.map((entry) => (
                      <Cell key={`month-profit-${entry.period}`} fill={entry.profitMan < 0 ? "#D88C8C" : "#9ABF9F"} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="cnt"
                    type="monotone"
                    dataKey="contractCount"
                    name="目標件数"
                    stroke="#8D99AE"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                    onClick={(d) => toggleOpenPeriod((d as { payload?: { period?: string } })?.payload?.period ?? null)}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-400">棒/線または表の行をタップすると、表の下で詳細タブが開きます。棒グラフは万円単位。</p>
          </div>

          <div className="mt-10">
            <h3 className="text-base font-medium text-zinc-800">年次の比較（直近5年）</h3>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" ifOverflow="extendDomain" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}万`} tick={{ fontSize: 11 }} width={44} />
                  <Tooltip
                    formatter={(value, name) => {
                      const n = typeof value === "number" ? value * 10000 : 0;
                      return [formatYen(n), String(name)];
                    }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7" }}
                  />
                  <Legend formatter={legendLabel} />
                  <Bar dataKey="revenueMan" name="年間売上（万円）" fill="#86A9B7" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="profitMan" name="年間利益（万円）" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {annualChartData.map((entry) => (
                      <Cell key={`annual-profit-${entry.year}`} fill={entry.profitMan < 0 ? "#D88C8C" : "#A3BFA8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-400">選択年を含む5年分。点線は損益ゼロライン、赤系バーは赤字です。</p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-semibold text-zinc-700">月</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">目標件数</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">売上（試算）</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">固定費計</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">変動費</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">利益（試算）</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <Fragment key={m.period}>
                    <tr
                      className={`cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 ${openPeriod === m.period ? "bg-zinc-50" : ""}`}
                      onClick={() => toggleOpenPeriod(m.period)}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {year}年{m.label}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-800">{m.contractCount} 件</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-800">{formatYen(m.revenueYen)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{formatYen(m.fixedYen)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{formatYen(m.variableYen)}</td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-medium ${m.profitYen < 0 ? "text-red-700" : "text-zinc-900"}`}
                      >
                        {formatYen(m.profitYen)}
                      </td>
                    </tr>
                    {openPeriod === m.period && (
                      <tr className="border-b border-zinc-200 bg-zinc-50/70">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-zinc-900">{year}年{m.label} の詳細</p>
                            <p className="text-xs text-zinc-500">
                              {m.usedPlanBreakdown ? "プラン別目標から算出" : `月目標（${m.monthGoal ?? 0}件）ベース`}
                            </p>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailTab("summary")}
                              className={`rounded-md px-3 py-1.5 text-xs font-medium ${detailTab === "summary" ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-300"}`}
                            >
                              概要
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailTab("plans")}
                              className={`rounded-md px-3 py-1.5 text-xs font-medium ${detailTab === "plans" ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-300"}`}
                            >
                              プラン別内訳
                            </button>
                          </div>

                          {detailTab === "summary" && (
                            <div className="mt-3 grid gap-2 sm:grid-cols-4">
                              <div className="rounded-md bg-white px-3 py-2 ring-1 ring-zinc-200">
                                <p className="text-[11px] text-zinc-500">目標件数</p>
                                <p className="mt-0.5 font-semibold tabular-nums text-zinc-900">{m.contractCount} 件</p>
                              </div>
                              <div className="rounded-md bg-white px-3 py-2 ring-1 ring-zinc-200">
                                <p className="text-[11px] text-zinc-500">売上（試算）</p>
                                <p className="mt-0.5 font-semibold tabular-nums text-zinc-900">{formatYen(m.revenueYen)}</p>
                              </div>
                              <div className="rounded-md bg-white px-3 py-2 ring-1 ring-zinc-200">
                                <p className="text-[11px] text-zinc-500">変動費</p>
                                <p className="mt-0.5 font-semibold tabular-nums text-zinc-900">{formatYen(m.variableYen)}</p>
                              </div>
                              <div className="rounded-md bg-white px-3 py-2 ring-1 ring-zinc-200">
                                <p className="text-[11px] text-zinc-500">利益（試算）</p>
                                <p className={`mt-0.5 font-semibold tabular-nums ${m.profitYen < 0 ? "text-red-700" : "text-zinc-900"}`}>
                                  {formatYen(m.profitYen)}
                                </p>
                              </div>
                            </div>
                          )}

                          {detailTab === "plans" && (
                            <>
                              {m.planBreakdown.length === 0 ? (
                                <p className="mt-3 text-sm text-zinc-500">
                                  プラン別の件数が未入力です。月目標ベースで売上・利益を算出しています。
                                </p>
                              ) : (
                                <div className="mt-3 overflow-x-auto rounded-md border border-zinc-200 bg-white">
                                  <table className="w-full min-w-[540px] text-left text-sm">
                                    <thead>
                                      <tr className="border-b border-zinc-200 bg-zinc-50">
                                        <th className="px-3 py-2.5 font-semibold text-zinc-700">プラン</th>
                                        <th className="px-3 py-2.5 text-right font-semibold text-zinc-700">件数</th>
                                        <th className="px-3 py-2.5 text-right font-semibold text-zinc-700">売上</th>
                                        <th className="px-3 py-2.5 text-right font-semibold text-zinc-700">変動費</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {m.planBreakdown.map((p) => (
                                        <tr key={p.courseId} className="border-b border-zinc-100">
                                          <td className="px-3 py-2.5 font-medium text-zinc-900">{p.name}</td>
                                          <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">{p.targetCount} 件</td>
                                          <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">{formatYen(p.revenueYen)}</td>
                                          <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">{formatYen(p.variableYen)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 bg-zinc-50">
                  <td className="px-4 py-3 font-semibold text-zinc-900">全月合計</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">
                    {monthTotals.contractCount} 件
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">
                    {formatYen(monthTotals.revenueYen)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-700">
                    {formatYen(monthTotals.fixedYen)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-700">
                    {formatYen(monthTotals.variableYen)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${monthTotals.profitYen < 0 ? "text-red-700" : "text-zinc-900"}`}
                  >
                    {formatYen(monthTotals.profitYen)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-semibold text-zinc-700">年</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">目標件数</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">売上</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">固定費（合計）</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">変動費</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">利益</th>
                </tr>
              </thead>
              <tbody>
                {annual.map((a) => (
                  <tr key={a.year} className="border-b border-zinc-100">
                    <td className="px-4 py-3 font-medium text-zinc-900">{a.year}年</td>
                    <td className="px-4 py-3 text-right tabular-nums">{a.contractCount} 件</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatYen(a.revenueYen)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{formatYen(a.fixedYen)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{formatYen(a.variableYen)}</td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${a.profitYen < 0 ? "text-red-700" : "text-zinc-900"}`}
                    >
                      {formatYen(a.profitYen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
