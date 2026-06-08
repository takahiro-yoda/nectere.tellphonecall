import { KpiDataSource, type KpiUnit } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getMonthRange,
  getWeekRange,
  getWeeksAround,
  getWeekPeriod,
  getMonthPeriod,
  type ViewPeriod,
  getRangeForView,
} from "@/lib/dateUtils";

export type KpiUnitInfo = Pick<KpiUnit, "id" | "name" | "symbol" | "position">;

export type KpiTagLite = { id: string; name: string; color: string | null };

export type KpiDashboardItem = {
  id: string;
  name: string;
  dataSource: KpiDataSource;
  unit: KpiUnitInfo;
  tags: KpiTagLite[];
  target: number | null;
  actual: number | null;
  achievementRate: number | null;
};

export type KpiPeriodRow = {
  period: string;
  label: string;
  isCurrent: boolean;
  target: number | null;
  actual: number | null;
  isManual: boolean;
};

const DEFAULT_UNITS = [
  { name: "件", symbol: "件", position: "suffix", sortOrder: 0 },
  { name: "パーセント", symbol: "%", position: "suffix", sortOrder: 1 },
  { name: "円", symbol: "円", position: "suffix", sortOrder: 2 },
  { name: "回", symbol: "回", position: "suffix", sortOrder: 3 },
] as const;

export async function ensureDefaultUnits() {
  const count = await prisma.kpiUnit.count();
  if (count > 0) return;
  await prisma.kpiUnit.createMany({ data: [...DEFAULT_UNITS] });
}

export function parsePeriodToRange(
  periodType: "week" | "month",
  period: string
): { start: Date; end: Date } | null {
  if (periodType === "week") return parseWeekPeriodToRange(period);
  return parseMonthPeriodToRange(period);
}

function parseWeekPeriodToRange(period: string): { start: Date; end: Date } | null {
  const match = period.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  if (week < 1 || week > 53) return null;

  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);
  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function parseMonthPeriodToRange(period: string): { start: Date; end: Date } | null {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  return getMonthRange(new Date(year, month - 1, 15));
}

export function getPeriodFromView(view: ViewPeriod): { periodType: "week" | "month"; period: string } {
  const range = getRangeForView(view);
  const ref = range.start;
  if (range.periodType === "week") {
    return { periodType: "week", period: getWeekPeriod(ref) };
  }
  return { periodType: "month", period: getMonthPeriod(ref) };
}

export async function computeActual(
  dataSource: KpiDataSource,
  range: { start: Date; end: Date },
  manualActual: number | null
): Promise<number | null> {
  if (dataSource === "MANUAL") {
    return manualActual;
  }

  if (dataSource === "CONTRACT_COUNT") {
    const count = await prisma.contract.count({
      where: { signedAt: { gte: range.start, lte: range.end } },
    });
    return count;
  }

  const calls = await prisma.call.findMany({
    where: { createdAt: { gte: range.start, lte: range.end } },
    select: { isAppointment: true, status: true },
  });

  if (dataSource === "CALL_COUNT") {
    return calls.length;
  }

  if (calls.length === 0) {
    return dataSource === "APPOINTMENT_RATE" || dataSource === "RESPONSE_RATE" ? null : 0;
  }

  if (dataSource === "APPOINTMENT_RATE") {
    const appoCount = calls.filter((c) => c.isAppointment).length;
    return Math.round((appoCount / calls.length) * 1000) / 10;
  }

  if (dataSource === "RESPONSE_RATE") {
    const noAnswerCount = calls.filter((c) => c.status === "NO_ANSWER").length;
    return Math.round(((calls.length - noAnswerCount) / calls.length) * 1000) / 10;
  }

  return null;
}

export function formatKpiValue(
  value: number | null,
  unit: KpiUnitInfo,
  dataSource?: KpiDataSource
): string {
  if (value == null) return "—";
  const isRate = dataSource === "APPOINTMENT_RATE" || dataSource === "RESPONSE_RATE";
  const isInteger = unit.symbol === "件" || unit.symbol === "円" || unit.symbol === "回";
  const formatted = isRate
    ? value.toFixed(1)
    : isInteger
      ? Math.round(value).toLocaleString("ja-JP")
      : value.toLocaleString("ja-JP", { maximumFractionDigits: 1 });

  if (unit.position === "prefix") return `${unit.symbol}${formatted}`;
  return `${formatted}${unit.symbol}`;
}

function calcAchievementRate(target: number | null, actual: number | null): number | null {
  if (target == null || target <= 0 || actual == null) return null;
  return Math.round((actual / target) * 1000) / 10;
}

export { calcAchievementRate };

export function isRateKpi(dataSource: KpiDataSource, unitSymbol: string): boolean {
  return (
    dataSource === "APPOINTMENT_RATE" ||
    dataSource === "RESPONSE_RATE" ||
    unitSymbol === "%"
  );
}

/** 月内に含まれる ISO 週一覧（月曜始まり） */
export function getWeeksInMonth(monthPeriod: string): { period: string; label: string }[] {
  const range = parseMonthPeriodToRange(monthPeriod);
  if (!range) return [];

  const weeks = new Map<string, { period: string; label: string }>();
  const d = new Date(range.start);
  while (d <= range.end) {
    const period = getWeekPeriod(d);
    if (!weeks.has(period)) {
      const { start, end } = getWeekRange(d);
      const label = `${start.getMonth() + 1}/${start.getDate()}〜${end.getMonth() + 1}/${end.getDate()}`;
      weeks.set(period, { period, label });
    }
    d.setDate(d.getDate() + 1);
  }
  return Array.from(weeks.values());
}

/** 月目標を週に均等配分（件数・金額向け）。率系は各週に同値を設定 */
export function distributeMonthlyToWeeks(
  monthlyTarget: number,
  weekCount: number,
  isRate: boolean
): number[] {
  if (weekCount <= 0) return [];
  if (isRate) return Array(weekCount).fill(monthlyTarget);

  const total = Math.round(monthlyTarget);
  const per = Math.floor(total / weekCount);
  const extra = total - per * weekCount;
  return Array.from({ length: weekCount }, (_, i) => per + (i < extra ? 1 : 0));
}

/** 週目標の合算（率系は平均）から月目標を算出 */
export function aggregateWeeksToMonth(weekTargets: number[], isRate: boolean): number {
  if (weekTargets.length === 0) return 0;
  if (isRate) {
    const sum = weekTargets.reduce((a, b) => a + b, 0);
    return Math.round((sum / weekTargets.length) * 10) / 10;
  }
  return weekTargets.reduce((a, b) => a + b, 0);
}

export type KpiActualDisplaySource = "week_sum" | "month_manual";

/** 週実績の合算（率系は平均） */
export function aggregateWeekActuals(weekActuals: (number | null)[], isRate: boolean): number | null {
  const values = weekActuals.filter((v): v is number => v != null);
  if (values.length === 0) return null;
  if (isRate) {
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }
  return values.reduce((a, b) => a + b, 0);
}

export function resolveMonthDisplayActual(
  monthManual: number | null,
  weekSum: number | null,
  source: KpiActualDisplaySource
): number | null {
  if (source === "month_manual") return monthManual;
  return weekSum;
}

function parseActualDisplaySource(raw: string | null | undefined): KpiActualDisplaySource {
  return raw === "month_manual" ? "month_manual" : "week_sum";
}

async function resolveManualActualForMonth(
  kpiId: string,
  monthPeriod: string,
  dataSource: KpiDataSource,
  unitSymbol: string,
  monthValue: { manualActual: number | null; actualDisplaySource: string | null } | undefined,
  prefetchedWeekValues?: Map<string, number | null>
): Promise<number | null> {
  const isRate = isRateKpi(dataSource, unitSymbol);
  const weeksInMonth = getWeeksInMonth(monthPeriod);
  let weekActuals: (number | null)[];

  if (prefetchedWeekValues) {
    weekActuals = weeksInMonth.map((w) => prefetchedWeekValues.get(w.period) ?? null);
  } else {
    const weekPeriods = weeksInMonth.map((w) => w.period);
    const weekValues = await prisma.kpiPeriodValue.findMany({
      where: {
        kpiDefinitionId: kpiId,
        periodType: "week",
        period: { in: weekPeriods },
      },
    });
    const byPeriod = Object.fromEntries(weekValues.map((v) => [v.period, v.manualActual ?? null]));
    weekActuals = weekPeriods.map((p) => byPeriod[p] ?? null);
  }

  const weekSum = aggregateWeekActuals(weekActuals, isRate);
  const monthManual = monthValue?.manualActual ?? null;
  const source = parseActualDisplaySource(monthValue?.actualDisplaySource);
  return resolveMonthDisplayActual(monthManual, weekSum, source);
}

async function upsertManualActual(
  kpiId: string,
  periodType: "week" | "month",
  period: string,
  value: number | null
) {
  const existing = await prisma.kpiPeriodValue.findUnique({
    where: {
      kpiDefinitionId_periodType_period: { kpiDefinitionId: kpiId, periodType, period },
    },
  });

  if (existing) {
    await prisma.kpiPeriodValue.update({
      where: { id: existing.id },
      data: { manualActual: value },
    });
  } else {
    await prisma.kpiPeriodValue.create({
      data: {
        kpiDefinitionId: kpiId,
        periodType,
        period,
        targetValue: 0,
        manualActual: value,
        actualDisplaySource: periodType === "month" ? "week_sum" : undefined,
      },
    });
  }
}

export type KpiMonthEditorWeek = {
  period: string;
  label: string;
  isCurrent: boolean;
  target: number | null;
  actual: number | null;
  achievementRate: number | null;
};

export type KpiMonthEditorData = {
  monthPeriod: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  monthTarget: number | null;
  monthActual: number | null;
  monthManualActual: number | null;
  weekActualSum: number | null;
  actualDisplaySource: KpiActualDisplaySource;
  monthAchievementRate: number | null;
  weeks: KpiMonthEditorWeek[];
  weekTargetSum: number;
  isManual: boolean;
  isRateType: boolean;
  unitSymbol: string;
};

export async function getKpiMonthEditorData(
  kpiId: string,
  monthPeriod: string
): Promise<KpiMonthEditorData | null> {
  const kpi = await prisma.kpiDefinition.findUnique({
    where: { id: kpiId },
    include: { unit: true },
  });
  if (!kpi) return null;

  const monthRange = parseMonthPeriodToRange(monthPeriod);
  if (!monthRange) return null;

  const now = new Date();
  const currentMonthPeriod = getMonthPeriod(now);
  const { start } = monthRange;
  const monthLabel =
    monthPeriod === currentMonthPeriod
      ? "今月"
      : `${start.getFullYear()}年${start.getMonth() + 1}月`;

  const weeksInMonth = getWeeksInMonth(monthPeriod);
  const weekPeriods = weeksInMonth.map((w) => w.period);
  const allPeriods = [monthPeriod, ...weekPeriods];

  const values = await prisma.kpiPeriodValue.findMany({
    where: {
      kpiDefinitionId: kpiId,
      period: { in: allPeriods },
    },
  });

  const monthValue = values.find((v) => v.periodType === "month" && v.period === monthPeriod);
  const weekValues = Object.fromEntries(
    values.filter((v) => v.periodType === "week").map((v) => [v.period, v])
  );

  const isRate = isRateKpi(kpi.dataSource, kpi.unit.symbol);
  const currentWeekPeriod = getWeekPeriod(now);

  const weeks: KpiMonthEditorWeek[] = [];
  for (const w of weeksInMonth) {
    const pv = weekValues[w.period];
    const range = parseWeekPeriodToRange(w.period);
    const target = pv?.targetValue ?? null;
    const actual =
      range != null
        ? await computeActual(kpi.dataSource, range, pv?.manualActual ?? null)
        : null;
    weeks.push({
      period: w.period,
      label: w.label,
      isCurrent: w.period === currentWeekPeriod,
      target,
      actual,
      achievementRate: calcAchievementRate(target, actual),
    });
  }

  const monthTarget = monthValue?.targetValue ?? null;
  const weekTargetSum = weeks.reduce((s, w) => s + (w.target ?? 0), 0);

  const weekActualsForSum = weeks.map((w) => w.actual);
  const weekActualSum = kpi.dataSource === "MANUAL"
    ? aggregateWeekActuals(weekActualsForSum, isRate)
    : null;
  const monthManualActual =
    kpi.dataSource === "MANUAL" ? (monthValue?.manualActual ?? null) : null;
  const actualDisplaySource = parseActualDisplaySource(monthValue?.actualDisplaySource);

  const monthActual =
    kpi.dataSource === "MANUAL"
      ? resolveMonthDisplayActual(monthManualActual, weekActualSum, actualDisplaySource)
      : await computeActual(kpi.dataSource, monthRange, monthValue?.manualActual ?? null);

  return {
    monthPeriod,
    monthLabel,
    isCurrentMonth: monthPeriod === currentMonthPeriod,
    monthTarget,
    monthActual,
    monthManualActual,
    weekActualSum,
    actualDisplaySource,
    monthAchievementRate: calcAchievementRate(monthTarget, monthActual),
    weeks,
    weekTargetSum,
    isManual: kpi.dataSource === "MANUAL",
    isRateType: isRate,
    unitSymbol: kpi.unit.symbol,
  };
}

export async function setMonthTargetAndDistribute(
  kpiId: string,
  monthPeriod: string,
  target: number
): Promise<KpiMonthEditorData | null> {
  const kpi = await prisma.kpiDefinition.findUnique({
    where: { id: kpiId },
    include: { unit: true },
  });
  if (!kpi || target < 0) return null;

  await upsertKpiTarget(kpiId, "month", monthPeriod, target);

  const weeksInMonth = getWeeksInMonth(monthPeriod);
  const isRate = isRateKpi(kpi.dataSource, kpi.unit.symbol);
  const distributed = distributeMonthlyToWeeks(target, weeksInMonth.length, isRate);

  await Promise.all(
    weeksInMonth.map((w, i) => upsertKpiTarget(kpiId, "week", w.period, distributed[i] ?? 0))
  );

  return getKpiMonthEditorData(kpiId, monthPeriod);
}

export async function setWeekTargetAndSyncMonth(
  kpiId: string,
  monthPeriod: string,
  weekPeriod: string,
  target: number
): Promise<KpiMonthEditorData | null> {
  const kpi = await prisma.kpiDefinition.findUnique({
    where: { id: kpiId },
    include: { unit: true },
  });
  if (!kpi || target < 0) return null;

  await upsertKpiTarget(kpiId, "week", weekPeriod, target);

  const weeksInMonth = getWeeksInMonth(monthPeriod);
  const weekPeriods = weeksInMonth.map((w) => w.period);

  const weekValues = await prisma.kpiPeriodValue.findMany({
    where: {
      kpiDefinitionId: kpiId,
      periodType: "week",
      period: { in: weekPeriods },
    },
  });
  const targetByPeriod = Object.fromEntries(weekValues.map((v) => [v.period, v.targetValue]));

  // 未設定週は 0 として合算
  const weekTargets = weekPeriods.map((p) =>
    p === weekPeriod ? target : (targetByPeriod[p] ?? 0)
  );

  const isRate = isRateKpi(kpi.dataSource, kpi.unit.symbol);
  const monthTarget = aggregateWeeksToMonth(weekTargets, isRate);
  await upsertKpiTarget(kpiId, "month", monthPeriod, monthTarget);

  return getKpiMonthEditorData(kpiId, monthPeriod);
}

export async function setWeekManualActual(
  kpiId: string,
  monthPeriod: string,
  weekPeriod: string,
  value: number | null
): Promise<KpiMonthEditorData | null> {
  const kpi = await prisma.kpiDefinition.findUnique({ where: { id: kpiId } });
  if (!kpi || kpi.dataSource !== "MANUAL") return null;

  await upsertManualActual(kpiId, "week", weekPeriod, value);
  return getKpiMonthEditorData(kpiId, monthPeriod);
}

export async function setMonthManualActual(
  kpiId: string,
  monthPeriod: string,
  value: number | null
): Promise<KpiMonthEditorData | null> {
  const kpi = await prisma.kpiDefinition.findUnique({ where: { id: kpiId } });
  if (!kpi || kpi.dataSource !== "MANUAL") return null;

  await upsertManualActual(kpiId, "month", monthPeriod, value);
  return getKpiMonthEditorData(kpiId, monthPeriod);
}

export async function setActualDisplaySource(
  kpiId: string,
  monthPeriod: string,
  source: KpiActualDisplaySource
): Promise<KpiMonthEditorData | null> {
  const kpi = await prisma.kpiDefinition.findUnique({ where: { id: kpiId } });
  if (!kpi || kpi.dataSource !== "MANUAL") return null;

  const existing = await prisma.kpiPeriodValue.findUnique({
    where: {
      kpiDefinitionId_periodType_period: {
        kpiDefinitionId: kpiId,
        periodType: "month",
        period: monthPeriod,
      },
    },
  });

  if (existing) {
    await prisma.kpiPeriodValue.update({
      where: { id: existing.id },
      data: { actualDisplaySource: source },
    });
  } else {
    await prisma.kpiPeriodValue.create({
      data: {
        kpiDefinitionId: kpiId,
        periodType: "month",
        period: monthPeriod,
        targetValue: 0,
        actualDisplaySource: source,
      },
    });
  }

  return getKpiMonthEditorData(kpiId, monthPeriod);
}

/** @deprecated use setWeekManualActual / setMonthManualActual */
export async function setManualActual(
  kpiId: string,
  periodType: "week" | "month",
  period: string,
  value: number | null
): Promise<void> {
  const kpi = await prisma.kpiDefinition.findUnique({ where: { id: kpiId } });
  if (!kpi || kpi.dataSource !== "MANUAL") return;
  await upsertManualActual(kpiId, periodType, period, value);
}

async function upsertKpiTarget(
  kpiDefinitionId: string,
  periodType: "week" | "month",
  period: string,
  targetValue: number
) {
  await prisma.kpiPeriodValue.upsert({
    where: {
      kpiDefinitionId_periodType_period: { kpiDefinitionId, periodType, period },
    },
    create: { kpiDefinitionId, periodType, period, targetValue },
    update: { targetValue },
  });
}

export async function getKpiDashboard(
  periodType: "week" | "month",
  period: string
): Promise<KpiDashboardItem[]> {
  const range = parsePeriodToRange(periodType, period);
  if (!range) return [];

  const definitions = await prisma.kpiDefinition.findMany({
    where: { isActive: true },
    include: {
      unit: true,
      tags: { orderBy: { name: "asc" }, select: { id: true, name: true, color: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const periodValues = await prisma.kpiPeriodValue.findMany({
    where: {
      periodType,
      period,
      kpiDefinitionId: { in: definitions.map((d) => d.id) },
    },
  });
  const valueByKpiId = Object.fromEntries(periodValues.map((v) => [v.kpiDefinitionId, v]));

  // 月表示の手入力KPI: 週実績合算用データを一括取得
  let weekValuesByKpi = new Map<string, Map<string, number | null>>();
  if (periodType === "month") {
    const manualDefs = definitions.filter((d) => d.dataSource === "MANUAL");
    if (manualDefs.length > 0) {
      const weeksInMonth = getWeeksInMonth(period);
      const weekPeriods = weeksInMonth.map((w) => w.period);
      const allWeekValues = await prisma.kpiPeriodValue.findMany({
        where: {
          kpiDefinitionId: { in: manualDefs.map((d) => d.id) },
          periodType: "week",
          period: { in: weekPeriods },
        },
      });
      for (const v of allWeekValues) {
        if (!weekValuesByKpi.has(v.kpiDefinitionId)) {
          weekValuesByKpi.set(v.kpiDefinitionId, new Map());
        }
        weekValuesByKpi.get(v.kpiDefinitionId)!.set(v.period, v.manualActual ?? null);
      }
    }
  }

  const items: KpiDashboardItem[] = [];
  for (const def of definitions) {
    const pv = valueByKpiId[def.id];
    const target = pv?.targetValue ?? null;

    let actual: number | null;
    if (def.dataSource === "MANUAL" && periodType === "month") {
      actual = await resolveManualActualForMonth(
        def.id,
        period,
        def.dataSource,
        def.unit.symbol,
        pv,
        weekValuesByKpi.get(def.id)
      );
    } else {
      actual = await computeActual(def.dataSource, range, pv?.manualActual ?? null);
    }

    items.push({
      id: def.id,
      name: def.name,
      dataSource: def.dataSource,
      tags: def.tags,
      unit: {
        id: def.unit.id,
        name: def.unit.name,
        symbol: def.unit.symbol,
        position: def.unit.position,
      },
      target: target != null && target > 0 ? target : target === 0 ? 0 : null,
      actual,
      achievementRate: calcAchievementRate(target, actual),
    });
  }
  return items;
}

export async function getKpiPeriodRows(
  kpiId: string,
  periodType: "week" | "month",
  year?: number
): Promise<KpiPeriodRow[]> {
  const kpi = await prisma.kpiDefinition.findUnique({
    where: { id: kpiId },
    include: { unit: true },
  });
  if (!kpi) return [];

  let rows: { period: string; label: string; isCurrent: boolean }[];

  if (periodType === "week") {
    rows = getWeeksAround(new Date(), 2, 2);
  } else {
    const y = year ?? new Date().getFullYear();
    const now = new Date();
    const currentMonthPeriod = getMonthPeriod(now);
    rows = Array.from({ length: 12 }, (_, i) => {
      const period = `${y}-${String(i + 1).padStart(2, "0")}`;
      const { start, end } = getMonthRange(new Date(y, i, 15));
      const isCurrent = period === currentMonthPeriod;
      const label = isCurrent
        ? "今月"
        : `${start.getFullYear()}年${start.getMonth() + 1}月`;
      return { period, label, isCurrent };
    });
  }

  const periodList = rows.map((r) => r.period);
  const values = await prisma.kpiPeriodValue.findMany({
    where: { kpiDefinitionId: kpiId, periodType, period: { in: periodList } },
  });
  const valueByPeriod = Object.fromEntries(values.map((v) => [v.period, v]));

  const result: KpiPeriodRow[] = [];
  for (const row of rows) {
    const pv = valueByPeriod[row.period];
    const range = parsePeriodToRange(periodType, row.period);
    const target = pv?.targetValue ?? null;
    const actual =
      range != null
        ? await computeActual(kpi.dataSource, range, pv?.manualActual ?? null)
        : null;
    result.push({
      period: row.period,
      label: row.label,
      isCurrent: row.isCurrent,
      target,
      actual,
      isManual: kpi.dataSource === "MANUAL",
    });
  }
  return result;
}

export const KPI_DATA_SOURCE_LABELS: Record<KpiDataSource, string> = {
  MANUAL: "手入力",
  CALL_COUNT: "架電数（自動）",
  APPOINTMENT_RATE: "アポ率（自動）",
  RESPONSE_RATE: "応答率（自動）",
  CONTRACT_COUNT: "契約数（自動）",
};

export const KPI_TEMPLATES = [
  { name: "架電数", dataSource: "CALL_COUNT" as KpiDataSource, unitSymbol: "件" },
  { name: "アポ率", dataSource: "APPOINTMENT_RATE" as KpiDataSource, unitSymbol: "%" },
  { name: "応答率", dataSource: "RESPONSE_RATE" as KpiDataSource, unitSymbol: "%" },
  { name: "契約数", dataSource: "CONTRACT_COUNT" as KpiDataSource, unitSymbol: "件" },
];

/** ダッシュボード表示順を一括更新（先頭が sortOrder 0） */
export async function reorderKpiDefinitions(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;

  const existing = await prisma.kpiDefinition.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true },
  });
  if (existing.length !== orderedIds.length) {
    throw new Error("invalid ids");
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.kpiDefinition.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
}
