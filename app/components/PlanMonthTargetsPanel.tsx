"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CourseRow = { id: string; name: string; revenueYen: number | null };

function formatYen(n: number | null) {
  if (n == null) return "—（標準単価を使用）";
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);
}

type Props = {
  defaultPeriod: string;
  courses: CourseRow[];
};

export function PlanMonthTargetsPanel({ defaultPeriod, courses }: Props) {
  const router = useRouter();
  const [year, setYear] = useState(() => parseInt(defaultPeriod.slice(0, 4), 10));
  const [period, setPeriod] = useState(defaultPeriod);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [prev1Targets, setPrev1Targets] = useState<Record<string, number>>({});
  const [prev2Targets, setPrev2Targets] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const courseIds = useMemo(() => courses.map((c) => c.id).join(","), [courses]);

  const periodLabel = useMemo(() => {
    const [y, m] = period.split("-");
    if (!y || !m) return period;
    return `${y}年${parseInt(m, 10)}月`;
  }, [period]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, "0");
      const p = `${year}-${mm}`;
      return { period: p, label: `${year}年${i + 1}月` };
    });
  }, [year]);

  const previousPeriods = useMemo(() => {
    const [y, m] = period.split("-");
    const yy = parseInt(y, 10);
    const mm = parseInt(m, 10);
    if (!Number.isFinite(yy) || !Number.isFinite(mm)) {
      return { prev1: period, prev2: period, prev1Label: "前月", prev2Label: "前々月" };
    }
    const d = new Date(yy, mm - 1, 1);
    const d1 = new Date(d);
    d1.setMonth(d.getMonth() - 1);
    const d2 = new Date(d);
    d2.setMonth(d.getMonth() - 2);
    const prev1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}`;
    const prev2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}`;
    return {
      prev1,
      prev2,
      prev1Label: `${d1.getFullYear()}年${d1.getMonth() + 1}月`,
      prev2Label: `${d2.getFullYear()}年${d2.getMonth() + 1}月`,
    };
  }, [period]);

  const loadTargets = useCallback(
    async (p: string) => {
      if (courses.length === 0) return;
      setLoading(true);
      try {
        const [y, m] = p.split("-");
        const yy = parseInt(y, 10);
        const mm = parseInt(m, 10);
        const d = new Date(yy, mm - 1, 1);
        const d1 = new Date(d);
        d1.setMonth(d.getMonth() - 1);
        const d2 = new Date(d);
        d2.setMonth(d.getMonth() - 2);
        const p1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}`;
        const p2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}`;

        const [res, res1, res2] = await Promise.all([
          fetch(`/api/contract-plan-targets?period=${encodeURIComponent(p)}`),
          fetch(`/api/contract-plan-targets?period=${encodeURIComponent(p1)}`),
          fetch(`/api/contract-plan-targets?period=${encodeURIComponent(p2)}`),
        ]);
        const [data, data1, data2] = await Promise.all([res.json(), res1.json(), res2.json()]);
        const next: Record<string, string> = {};
        const prev1: Record<string, number> = {};
        const prev2: Record<string, number> = {};
        for (const c of courses) next[c.id] = "0";
        if (Array.isArray(data.targets)) {
          for (const t of data.targets as { courseId: string; targetCount: number }[]) {
            next[t.courseId] = String(t.targetCount);
          }
        }
        if (Array.isArray(data1.targets)) {
          for (const t of data1.targets as { courseId: string; targetCount: number }[]) {
            prev1[t.courseId] = t.targetCount;
          }
        }
        if (Array.isArray(data2.targets)) {
          for (const t of data2.targets as { courseId: string; targetCount: number }[]) {
            prev2[t.courseId] = t.targetCount;
          }
        }
        setDraft(next);
        setPrev1Targets(prev1);
        setPrev2Targets(prev2);
      } finally {
        setLoading(false);
      }
    },
    [courses],
  );

  useEffect(() => {
    void loadTargets(period);
  }, [period, loadTargets, courseIds]);

  async function save() {
    const targets = courses.map((c) => {
      const raw = draft[c.id] ?? "0";
      const n = parseInt(raw, 10);
      return {
        courseId: c.id,
        targetCount: Number.isNaN(n) || n < 0 ? 0 : n,
      };
    });
    setSaving(true);
    try {
      const res = await fetch("/api/contract-plan-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, targets }),
      });
      if (res.ok) {
        router.refresh();
        window.dispatchEvent(new CustomEvent("contract-target-period-saved", { detail: { period } }));
      }
    } finally {
      setSaving(false);
    }
  }

  if (courses.length === 0) return null;

  return (
    <div className="mt-8 border-t border-zinc-200 pt-8">
      <h3 className="text-base font-semibold text-zinc-900">プラン別・月ごとの目標件数</h3>
      <p className="mt-1 text-sm text-zinc-500">
        対象月を選んで、料金表のプランごとの契約目標件数を入力します。1 件でも入っている月は、その月の「目標ベース」試算にプラン内訳を使います（今月のカードは常に当月）。
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          年
          <select
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              setYear(y);
              setPeriod(`${y}-${period.slice(5, 7)}`);
            }}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          月
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="min-w-[8.5rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {monthOptions.map((o) => (
              <option key={o.period} value={o.period}>
                {o.label}
                {o.period === defaultPeriod ? "（今月）" : ""}
              </option>
            ))}
          </select>
        </label>
        {loading && <span className="pb-2 text-xs text-zinc-400">読み込み中…</span>}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-3 font-semibold text-zinc-700">プラン</th>
              <th className="px-4 py-3 font-semibold text-zinc-700">売上単価（試算）</th>
              <th className="w-28 px-4 py-3 font-semibold text-zinc-700">{previousPeriods.prev2Label}</th>
              <th className="w-28 px-4 py-3 font-semibold text-zinc-700">{previousPeriods.prev1Label}</th>
              <th className="w-32 px-4 py-3 font-semibold text-zinc-700">目標（件）</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-zinc-100">
                <td className="px-4 py-3 font-medium text-zinc-900">{c.name}</td>
                <td className="px-4 py-3 tabular-nums text-zinc-600">{formatYen(c.revenueYen)}</td>
                <td className="px-4 py-3 tabular-nums text-zinc-500">{prev2Targets[c.id] ?? 0} 件</td>
                <td className="px-4 py-3 tabular-nums text-zinc-500">{prev1Targets[c.id] ?? 0} 件</td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft[c.id] ?? "0"}
                    onChange={(e) => setDraft((p) => ({ ...p, [c.id]: e.target.value }))}
                    disabled={loading}
                    className="w-full max-w-[6.5rem] rounded border border-zinc-300 px-2 py-2 text-right tabular-nums text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "保存中…" : `${periodLabel}のプラン別目標を保存`}
        </button>
        {period === defaultPeriod && (
          <span className="text-xs text-zinc-400">上の「今月の売上・利益試算」の目標に反映されます。</span>
        )}
        {period !== defaultPeriod && (
          <span className="text-xs text-zinc-400">今月以外は試算カードは変わりません。来月以降の入力にご利用ください。</span>
        )}
      </div>
    </div>
  );
}
