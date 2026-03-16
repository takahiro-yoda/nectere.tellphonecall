"use client";

import { useState, type ComponentProps } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { AssigneeStat } from "@/lib/calls";

export type ChartViewType = "grouped" | "stacked" | "horizontal" | "table";

const CHART_VIEWS: { value: ChartViewType; label: string }[] = [
  { value: "grouped", label: "縦棒（並列）" },
  { value: "stacked", label: "縦棒（積み上げ）" },
  { value: "horizontal", label: "横棒" },
  { value: "table", label: "表で見る" },
];

type Props = {
  byAssignee: AssigneeStat[];
  periodLabel?: string;
};

const AXIS_STYLE = {
  tick: { fontSize: 16, fill: "#18181b", fontWeight: 600 },
  axisLine: { stroke: "#18181b", strokeWidth: 1.5 },
};
const GRID_STROKE = "#a1a1aa";

export function StatsCharts({ byAssignee, periodLabel = "今月" }: Props) {
  const [chartView, setChartView] = useState<ChartViewType>("grouped");
  const chartTitle = `担当別架電数（${periodLabel}）`;

  if (byAssignee.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-900">{chartTitle}</h2>
        <p className="mt-4 text-sm text-zinc-500">
          データがありません。架電記録で担当者名を入れると表示されます。
        </p>
      </section>
    );
  }

  const data = byAssignee.map((a) => ({
    name: a.assignee,
    架電数: a.count,
    アポ: a.appoCount,
    アポ率: a.count > 0 ? Math.round((a.appoCount / a.count) * 1000) / 10 : 0,
  }));

  const renderTooltip: ComponentProps<typeof Tooltip>["content"] = ({ active, payload, label }) => {
    if (!active || !payload?.length || label == null) return null;
    const row = data.find((d) => d.name === String(label));
    return (
      <div className="rounded-lg border-2 border-zinc-300 bg-white px-4 py-3 shadow-lg">
        <p className="mb-2 text-lg font-bold text-zinc-900">{label}</p>
        <ul className="space-y-1 text-base text-zinc-700">
          <li>架電数: {row?.架電数 ?? 0}件</li>
          <li>アポ数: {row?.アポ ?? 0}件</li>
          <li className="font-bold text-emerald-700">アポ率: {row?.アポ率 ?? 0}%</li>
        </ul>
      </div>
    );
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">{chartTitle}</h2>
          <p className="mt-1 text-sm text-zinc-500">架電数とアポ数・アポ率を表示</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
          {CHART_VIEWS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setChartView(opt.value)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                chartView === opt.value
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {chartView === "table" ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[400px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-zinc-300 bg-zinc-50">
                <th className="px-4 py-3 text-base font-bold text-zinc-900">担当者</th>
                <th className="px-4 py-3 text-base font-bold text-zinc-900 text-right">架電数</th>
                <th className="px-4 py-3 text-base font-bold text-zinc-900 text-right">アポ数</th>
                <th className="px-4 py-3 text-base font-bold text-emerald-800 text-right">アポ率</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.name}
                  className={`border-b border-zinc-200 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}`}
                >
                  <td className="px-4 py-3 text-base font-semibold text-zinc-900">{row.name}</td>
                  <td className="px-4 py-3 text-base text-zinc-700 text-right">{row.架電数}件</td>
                  <td className="px-4 py-3 text-base text-zinc-700 text-right">{row.アポ}件</td>
                  <td className="px-4 py-3 text-base font-bold text-emerald-700 text-right">{row.アポ率}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 h-96 w-full min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === "horizontal" ? (
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 12, right: 24, left: 80, bottom: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                <XAxis type="number" tick={AXIS_STYLE.tick} tickLine={AXIS_STYLE.axisLine} axisLine={AXIS_STYLE.axisLine} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={76} tick={AXIS_STYLE.tick} tickLine={false} axisLine={AXIS_STYLE.axisLine} />
                <Tooltip content={renderTooltip} cursor={{ fill: "#f4f4f5" }} />
                <Bar dataKey="架電数" name="架電数" fill="#334155" radius={[0, 4, 4, 0]} barSize={24} maxBarSize={32}>
                  <LabelList dataKey="架電数" position="right" fill="#18181b" fontSize={14} fontWeight={600} />
                </Bar>
                <Bar dataKey="アポ" name="アポ数" fill="#047857" radius={[0, 4, 4, 0]} barSize={24} maxBarSize={32}>
                  <LabelList dataKey="アポ" position="right" fill="#18181b" fontSize={14} fontWeight={600} />
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={data} margin={{ top: 20, right: 20, left: 12, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={AXIS_STYLE.tick}
                  tickLine={false}
                  axisLine={AXIS_STYLE.axisLine}
                />
                <YAxis
                  tick={AXIS_STYLE.tick}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip content={renderTooltip} cursor={{ fill: "#f4f4f5" }} />
                {chartView === "stacked" ? (
                  <>
                    <Bar dataKey="架電数" name="架電数" stackId="a" fill="#64748b" radius={[0, 0, 0, 0]} barSize={56}>
                      <LabelList dataKey="架電数" position="center" fill="#fff" fontSize={15} fontWeight={700} />
                    </Bar>
                    <Bar dataKey="アポ" name="アポ数" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} barSize={56}>
                      <LabelList dataKey="アポ" position="center" fill="#fff" fontSize={15} fontWeight={700} />
                    </Bar>
                  </>
                ) : (
                  <>
                    <Bar dataKey="架電数" name="架電数" fill="#334155" radius={[4, 4, 0, 0]} barSize={44} maxBarSize={56}>
                      <LabelList dataKey="架電数" position="top" fill="#18181b" fontSize={15} fontWeight={700} />
                    </Bar>
                    <Bar dataKey="アポ" name="アポ数" fill="#047857" radius={[4, 4, 0, 0]} barSize={44} maxBarSize={56}>
                      <LabelList dataKey="アポ" position="top" fill="#18181b" fontSize={15} fontWeight={700} />
                    </Bar>
                  </>
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {chartView !== "table" && (
        <div className="mt-4 flex flex-wrap items-center gap-5 text-base">
          <span className="flex items-center gap-2 font-semibold text-zinc-800">
            <span className="h-4 w-6 rounded bg-slate-700" aria-hidden />
            架電数
          </span>
          <span className="flex items-center gap-2 font-semibold text-zinc-800">
            <span className="h-4 w-6 rounded bg-emerald-600" aria-hidden />
            アポ数
          </span>
        </div>
      )}
    </section>
  );
}
