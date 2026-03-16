"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { DailyStat } from "@/lib/calls";

const AXIS_STYLE = {
  tick: { fontSize: 12, fill: "#18181b", fontWeight: 600 },
  axisLine: { stroke: "#18181b", strokeWidth: 1.5 },
};
const GRID_STROKE = "#a1a1aa";

type Props = {
  dailyStats: DailyStat[];
  periodLabel: string;
};

export function DailyChart({ dailyStats, periodLabel }: Props) {
  const title = `日別架電数（${periodLabel}）`;
  const data = dailyStats.map((d) => ({
    ...d,
    countLine: d.count > 0 ? (d.count as number) : (null as number | null),
    appoRate:
      d.count > 0 ? (Math.round((d.appoCount / d.count) * 1000) / 10) : (null as number | null),
    responseRate:
      d.count > 0
        ? (Math.round(((d.count - d.noAnswerCount) / d.count) * 1000) / 10)
        : (null as number | null),
  }));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500">
        架電数は棒、アポ率と応答率は線で表示（ツールチップで内訳も確認できます）
      </p>
      <div className="mt-6 -mx-4 overflow-x-auto px-4">
        <div
          className="h-80 min-h-[280px]"
          style={{
            minWidth: `${Math.max(640, dailyStats.length * 40)}px`,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 56, left: 12, bottom: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_STYLE.tick}
                tickLine={false}
                axisLine={AXIS_STYLE.axisLine}
                interval={data.length > 14 ? Math.floor(data.length / 10) : 0}
              />
              <YAxis
                yAxisId="left"
                tick={AXIS_STYLE.tick}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ ...AXIS_STYLE.tick, fill: "#059669" }}
                tickLine={false}
                axisLine={{ stroke: "#059669", strokeWidth: 1.5 }}
                allowDecimals={false}
                width={40}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || !label) return null;
                  const row = data.find((d) => d.label === label);
                  const appoRate =
                    row && row.count > 0
                      ? Math.round((row.appoCount / row.count) * 1000) / 10
                      : null;
                  const responseRate =
                    row && row.count > 0
                      ? Math.round(((row.count - row.noAnswerCount) / row.count) * 1000) / 10
                      : null;
                  return (
                    <div className="rounded-lg border-2 border-zinc-300 bg-white px-4 py-3 shadow-lg">
                      <p className="mb-2 text-lg font-bold text-zinc-900">{row?.date ?? label}</p>
                      <ul className="space-y-1 text-base text-zinc-700">
                        <li>架電数: {row?.count ?? 0}件</li>
                        <li>アポ数: {row?.appoCount ?? 0}件</li>
                        <li>未応答: {row?.noAnswerCount ?? 0}件</li>
                        <li className="font-semibold text-emerald-700">
                          アポ率: {appoRate != null ? `${appoRate}%` : "—"}
                        </li>
                        <li className="font-semibold text-sky-700">
                          応答率: {responseRate != null ? `${responseRate}%` : "—"}
                        </li>
                      </ul>
                    </div>
                  );
                }}
                cursor={{ fill: "#f4f4f5" }}
              />
              <Bar
                yAxisId="left"
                dataKey="count"
                name="架電数"
                fill="#334155"
                radius={[4, 4, 0, 0]}
                barSize={28}
                maxBarSize={40}
              >
                <LabelList
                  dataKey="count"
                  position="top"
                  fill="#18181b"
                  fontSize={12}
                  fontWeight={700}
                />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="appoRate"
                name="アポ率"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ fill: "#059669", strokeWidth: 0, r: 4 }}
                connectNulls
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="responseRate"
                name="応答率"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ fill: "#0284c7", strokeWidth: 0, r: 3 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-5 text-base">
        <span className="flex items-center gap-2 font-semibold text-zinc-800">
          <span className="h-4 w-6 rounded bg-slate-700" aria-hidden />
          架電数（棒）
        </span>
        <span className="flex items-center gap-2 font-semibold text-emerald-700">
          <span className="inline-block h-0.5 w-6 rounded-full bg-emerald-600" aria-hidden />
          アポ率（線）
        </span>
        <span className="flex items-center gap-2 font-semibold text-sky-700">
          <span className="inline-block h-0.5 w-6 rounded-full bg-sky-500" aria-hidden />
          応答率（線）
        </span>
      </div>
    </section>
  );
}
