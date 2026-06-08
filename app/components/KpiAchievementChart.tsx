"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { KpiDashboardItem } from "@/lib/kpi";
import { formatKpiValue } from "@/lib/kpi";

type Props = {
  items: KpiDashboardItem[];
};

function barColor(rate: number | null): string {
  if (rate == null) return "#a1a1aa";
  if (rate >= 100) return "#10b981";
  if (rate >= 80) return "#52525b";
  return "#f59e0b";
}

export function KpiAchievementChart({ items }: Props) {
  const withTarget = items.filter((i) => i.target != null && i.target > 0);
  if (withTarget.length === 0) return null;

  const chartData = withTarget.map((item) => ({
    name: item.name,
    achievementRate: item.achievementRate ?? 0,
    hasRate: item.achievementRate != null,
    targetLabel: formatKpiValue(item.target, item.unit, item.dataSource),
    actualLabel: formatKpiValue(item.actual, item.unit, item.dataSource),
  }));

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
      <h3 className="text-sm font-semibold text-zinc-800">達成率一覧</h3>
      <p className="mt-0.5 text-xs text-zinc-500">目標に対する実績の達成率（100%ライン）</p>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10 + 10)]}
              tick={{ fontSize: 12, fill: "#71717a" }}
              unit="%"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 12, fill: "#18181b", fontWeight: 500 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as (typeof chartData)[0];
                return (
                  <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg">
                    <p className="font-semibold text-zinc-900">{d.name}</p>
                    <p className="mt-1 text-zinc-600">
                      達成率: <span className="font-bold tabular-nums">{d.hasRate ? `${d.achievementRate}%` : "—"}</span>
                    </p>
                    <p className="text-zinc-500">目標 {d.targetLabel} / 実績 {d.actualLabel}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={100} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="achievementRate" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={barColor(entry.hasRate ? entry.achievementRate : null)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
