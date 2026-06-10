"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { KpiDataSource } from "@prisma/client";
import type { KpiActualDisplaySource, KpiMonthEditorData } from "@/lib/kpi";
import { formatKpiValue, isRateKpi } from "@/lib/kpi";
import { getMonthPeriod } from "@/lib/dateUtils";
import { KpiAchievementBar } from "./KpiAchievementRing";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400";
const numberInputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900";

type KpiOption = {
  id: string;
  name: string;
  dataSource: string;
  unit: { id: string; name: string; symbol: string; position: string };
};

function monthOptions(): { period: string; label: string }[] {
  const now = new Date();
  const current = getMonthPeriod(now);
  const result: { period: string; label: string }[] = [];
  for (let offset = -2; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const period = getMonthPeriod(d);
    const label =
      period === current ? "今月" : `${d.getFullYear()}年${d.getMonth() + 1}月`;
    result.push({ period, label });
  }
  return result;
}

function applyEditorData(
  json: KpiMonthEditorData,
  setData: (d: KpiMonthEditorData) => void,
  setDraftMonthTarget: (v: string) => void,
  setDraftWeekTargets: (v: Record<string, string>) => void,
  setDraftActuals: (v: Record<string, string>) => void
) {
  setData(json);
  setDraftMonthTarget(json.monthTarget != null ? String(json.monthTarget) : "");
  const wt: Record<string, string> = {};
  const da: Record<string, string> = {};
  for (const w of json.weeks) {
    wt[w.period] = w.target != null ? String(w.target) : "";
    if (json.isManual) {
      da[`week:${w.period}`] = w.actual != null ? String(w.actual) : "";
    }
  }
  if (json.isManual) {
    da[`month:${json.monthPeriod}`] =
      json.monthManualActual != null ? String(json.monthManualActual) : "";
  }
  setDraftWeekTargets(wt);
  setDraftActuals(da);
}

export function KpiPeriodEditor() {
  const router = useRouter();
  const [kpis, setKpis] = useState<KpiOption[]>([]);
  const [selectedKpiId, setSelectedKpiId] = useState("");
  const [monthPeriod, setMonthPeriod] = useState(() => getMonthPeriod(new Date()));
  const [data, setData] = useState<KpiMonthEditorData | null>(null);
  const [draftMonthTarget, setDraftMonthTarget] = useState("");
  const [draftWeekTargets, setDraftWeekTargets] = useState<Record<string, string>>({});
  const [draftActuals, setDraftActuals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthChoices = monthOptions();

  async function parseApiError(res: Response): Promise<string> {
    try {
      const json = await res.json();
      if (typeof json.error === "string") return json.error;
    } catch {
      // ignore
    }
    return `保存に失敗しました（${res.status}）`;
  }

  const fetchKpis = useCallback(async () => {
    const res = await fetch("/api/kpi/definitions");
    const json = await res.json();
    const active = (Array.isArray(json.items) ? json.items : []).filter(
      (k: KpiOption & { isActive?: boolean }) => k.isActive !== false
    );
    setKpis(active);
    setSelectedKpiId((prev) => prev || active[0]?.id || "");
  }, []);

  const fetchMonthData = useCallback(async () => {
    if (!selectedKpiId) {
      setData(null);
      return;
    }
    setLoadingData(true);
    try {
      const res = await fetch(
        `/api/kpi/month-editor?kpiId=${encodeURIComponent(selectedKpiId)}&monthPeriod=${encodeURIComponent(monthPeriod)}`
      );
      if (!res.ok) throw new Error("Failed");
      const json: KpiMonthEditorData = await res.json();
      applyEditorData(json, setData, setDraftMonthTarget, setDraftWeekTargets, setDraftActuals);
    } finally {
      setLoadingData(false);
    }
  }, [selectedKpiId, monthPeriod]);

  useEffect(() => {
    fetchKpis().finally(() => setLoading(false));
  }, [fetchKpis]);

  useEffect(() => {
    void fetchMonthData();
  }, [fetchMonthData]);

  const selectedKpi = kpis.find((k) => k.id === selectedKpiId);
  const selectedIsRate = selectedKpi
    ? isRateKpi(selectedKpi.dataSource as KpiDataSource, selectedKpi.unit.symbol)
    : false;

  function handleEditorResponse(json: KpiMonthEditorData) {
    setError(null);
    applyEditorData(json, setData, setDraftMonthTarget, setDraftWeekTargets, setDraftActuals);
    router.refresh();
  }

  async function postTargets(body: Record<string, unknown>): Promise<KpiMonthEditorData> {
    const res = await fetch("/api/kpi/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const message = await parseApiError(res);
      setError(message);
      throw new Error(message);
    }
    return res.json() as Promise<KpiMonthEditorData>;
  }

  async function saveMonthTarget() {
    if (!selectedKpiId) return;
    const target = parseFloat(draftMonthTarget);
    if (Number.isNaN(target) || target < 0) return;

    setSaving("month");
    try {
      handleEditorResponse(
        await postTargets({
          mode: "month",
          kpiDefinitionId: selectedKpiId,
          monthPeriod,
          target,
        })
      );
    } catch {
      // error state set in postTargets
    } finally {
      setSaving(null);
    }
  }

  async function saveWeekTarget(weekPeriod: string) {
    if (!selectedKpiId) return;
    const target = parseFloat(draftWeekTargets[weekPeriod] ?? "");
    if (Number.isNaN(target) || target < 0) return;

    setSaving(weekPeriod);
    try {
      handleEditorResponse(
        await postTargets({
          mode: "week",
          kpiDefinitionId: selectedKpiId,
          monthPeriod,
          weekPeriod,
          target,
        })
      );
    } catch {
      // error state set in postTargets
    } finally {
      setSaving(null);
    }
  }

  async function saveWeekActual(weekPeriod: string) {
    if (!selectedKpiId) return;
    const raw = draftActuals[`week:${weekPeriod}`] ?? "";
    const value = raw === "" ? null : parseFloat(raw);
    if (value != null && (Number.isNaN(value) || value < 0)) return;

    setSaving(`actual-${weekPeriod}`);
    try {
      handleEditorResponse(
        await postTargets({
          mode: "weekActual",
          kpiDefinitionId: selectedKpiId,
          monthPeriod,
          weekPeriod,
          value,
        })
      );
    } catch {
      // error state set in postTargets
    } finally {
      setSaving(null);
    }
  }

  async function saveMonthActual() {
    if (!selectedKpiId || !data) return;
    const raw = draftActuals[`month:${data.monthPeriod}`] ?? "";
    const value = raw === "" ? null : parseFloat(raw);
    if (value != null && (Number.isNaN(value) || value < 0)) return;

    setSaving("monthActual");
    try {
      handleEditorResponse(
        await postTargets({
          mode: "monthActual",
          kpiDefinitionId: selectedKpiId,
          monthPeriod,
          value,
        })
      );
    } catch {
      // error state set in postTargets
    } finally {
      setSaving(null);
    }
  }

  async function changeDisplaySource(source: KpiActualDisplaySource) {
    if (!selectedKpiId) return;
    setSaving("displaySource");
    try {
      handleEditorResponse(
        await postTargets({
          mode: "actualDisplaySource",
          kpiDefinitionId: selectedKpiId,
          monthPeriod,
          source,
        })
      );
    } catch {
      // error state set in postTargets
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-zinc-500">読み込み中…</p>
      </section>
    );
  }

  if (kpis.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">目標・実績入力</h2>
        <p className="mt-2 text-sm text-zinc-500">先にKPIを追加してください。</p>
      </section>
    );
  }

  const unitInfo = selectedKpi
    ? {
        id: selectedKpi.unit.id,
        name: selectedKpi.unit.name,
        symbol: selectedKpi.unit.symbol,
        position: selectedKpi.unit.position,
      }
    : { id: "", name: "", symbol: "", position: "suffix" };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">目標・実績入力</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {(data?.isRateType ?? selectedIsRate)
          ? "％などの率系KPIは、月目標を各週に同じ値で設定し、週実績は平均で月に反映します。"
          : "週実績は自動で合算されます。月実績は直接入力も可能で、表示するデータを選択できます。"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={selectedKpiId}
          onChange={(e) => setSelectedKpiId(e.target.value)}
          className={inputClass}
        >
          {kpis.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <select
          value={monthPeriod}
          onChange={(e) => setMonthPeriod(e.target.value)}
          className={inputClass}
        >
          {monthChoices.map((m) => (
            <option key={m.period} value={m.period}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loadingData ? (
        <p className="mt-6 text-zinc-500">読み込み中…</p>
      ) : data ? (
        <div className="mt-6 space-y-4">
          <div
            className={`rounded-xl border-2 p-4 ${
              data.isCurrentMonth ? "border-blue-200 bg-blue-50/30" : "border-zinc-200 bg-zinc-50/50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">月間</p>
                <p className="mt-0.5 text-lg font-bold text-zinc-900">
                  {data.monthLabel}
                  {data.isCurrentMonth && (
                    <span className="ml-2 text-xs font-medium text-blue-600">現在</span>
                  )}
                </p>
              </div>
              {data.monthAchievementRate != null && (
                <div className="w-full max-w-sm">
                  <KpiAchievementBar rate={data.monthAchievementRate} />
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  月目標 ({data.unitSymbol})
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={draftMonthTarget}
                    onChange={(e) => setDraftMonthTarget(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void saveMonthTarget()}
                    className={numberInputClass}
                  />
                  <button
                    type="button"
                    onClick={() => void saveMonthTarget()}
                    disabled={saving === "month"}
                    className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {saving === "month"
                      ? "…"
                      : data.isRateType
                        ? "各週に反映"
                        : "週へ配分"}
                  </button>
                </div>
                {data.isRateType ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    率系は分割せず、各週に同じ目標を設定します
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-600">
                  {data.isRateType ? "週目標（各週同値）" : "週目標合計"}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-zinc-700">
                  {data.isRateType
                    ? data.weekTargetSum.toFixed(1)
                    : data.weekTargetSum.toLocaleString("ja-JP")}
                  {data.unitSymbol}
                </p>
              </div>
            </div>

            {data.isManual && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">月実績</p>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-zinc-500">
                      {data.isRateType ? "週平均（自動計算）" : "週合計（自動加算）"}
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
                      {data.weekActualSum != null
                        ? data.isRateType
                          ? `${data.weekActualSum.toFixed(1)}${data.unitSymbol}`
                          : `${data.weekActualSum.toLocaleString("ja-JP")}${data.unitSymbol}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">月直接入力</label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={draftActuals[`month:${data.monthPeriod}`] ?? ""}
                        onChange={(e) =>
                          setDraftActuals((prev) => ({
                            ...prev,
                            [`month:${data.monthPeriod}`]: e.target.value,
                          }))
                        }
                        className={numberInputClass}
                      />
                      <button
                        type="button"
                        onClick={() => void saveMonthActual()}
                        disabled={saving === "monthActual"}
                        className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-zinc-600">ダッシュボードに表示する実績</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void changeDisplaySource("week_sum")}
                      disabled={saving === "displaySource"}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        data.actualDisplaySource === "week_sum"
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {data.isRateType ? "週平均" : "週合計"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void changeDisplaySource("month_manual")}
                      disabled={saving === "displaySource"}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        data.actualDisplaySource === "month_manual"
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      月直接入力
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="text-xs text-zinc-500">表示中の月実績</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                    {formatKpiValue(data.monthActual, unitInfo, "MANUAL")}
                  </p>
                </div>
              </div>
            )}

            {!data.isManual && (
              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-600">月実績（自動集計）</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
                  {formatKpiValue(
                    data.monthActual,
                    unitInfo,
                    selectedKpi?.dataSource as KpiDataSource
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-semibold text-zinc-700">週</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 w-28">
                    目標 ({data.unitSymbol})
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 w-28">実績</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 min-w-[150px]">達成率</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {data.weeks.map((week) => (
                  <tr
                    key={week.period}
                    className={`border-b border-zinc-100 ${week.isCurrent ? "bg-blue-50/40" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">{week.label}</span>
                      {week.isCurrent && (
                        <span className="ml-1.5 text-xs text-blue-600">今週</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={draftWeekTargets[week.period] ?? ""}
                        onChange={(e) =>
                          setDraftWeekTargets((prev) => ({
                            ...prev,
                            [week.period]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && void saveWeekTarget(week.period)
                        }
                        className={numberInputClass}
                      />
                    </td>
                    <td className="px-4 py-2">
                      {data.isManual ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={draftActuals[`week:${week.period}`] ?? ""}
                          onChange={(e) =>
                            setDraftActuals((prev) => ({
                              ...prev,
                              [`week:${week.period}`]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && void saveWeekActual(week.period)
                          }
                          onBlur={() => void saveWeekActual(week.period)}
                          className={numberInputClass}
                        />
                      ) : (
                        <span className="tabular-nums text-zinc-700">
                          {formatKpiValue(
                            week.actual,
                            unitInfo,
                            selectedKpi?.dataSource as KpiDataSource
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <KpiAchievementBar rate={week.achievementRate} />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => void saveWeekTarget(week.period)}
                        disabled={saving === week.period}
                        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {saving === week.period ? "…" : "保存"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
