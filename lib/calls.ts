import { prisma } from "@/lib/db";
import {
  getWeekRange,
  getMonthRange,
  getWeekPeriod,
  getMonthPeriod,
  getRangeForView,
  type ViewPeriod,
} from "@/lib/dateUtils";

export async function getCounts(date: Date = new Date()) {
  const { start: weekStart, end: weekEnd } = getWeekRange(date);
  const { start: monthStart, end: monthEnd } = getMonthRange(date);

  const [weekCount, monthCount] = await Promise.all([
    prisma.call.count({ where: { createdAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.call.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
  ]);

  return { weekCount, monthCount };
}

export async function getGoals(date: Date = new Date()) {
  const weekPeriod = getWeekPeriod(date);
  const monthPeriod = getMonthPeriod(date);

  const [weekGoal, monthGoal] = await Promise.all([
    prisma.goal.findUnique({ where: { type_period: { type: "week", period: weekPeriod } } }),
    prisma.goal.findUnique({ where: { type_period: { type: "month", period: monthPeriod } } }),
  ]);

  return {
    week: weekGoal?.value ?? null,
    month: monthGoal?.value ?? null,
  };
}

export type AssigneeStat = {
  assignee: string;
  count: number;
  appoCount: number;
};

export type StatsResult = {
  byAssignee: AssigneeStat[];
  weekTotal: number;
  weekAppoCount: number;
  weekAppoRate: number | null; // 0-100 or null if no calls
  monthTotal: number;
  monthAppoCount: number;
  monthAppoRate: number | null;
};

export async function getStats(date: Date = new Date()): Promise<StatsResult> {
  const { start: weekStart, end: weekEnd } = getWeekRange(date);
  const { start: monthStart, end: monthEnd } = getMonthRange(date);

  const [weekCalls, monthCalls] = await Promise.all([
    prisma.call.findMany({
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
      select: { assigneeId: true, assignee: { select: { name: true } }, isAppointment: true },
    }),
    prisma.call.findMany({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      select: { assigneeId: true, assignee: { select: { name: true } }, isAppointment: true },
    }),
  ]);

  function aggregate(
    calls: { assignee: { name: string } | null; isAppointment: boolean }[]
  ) {
    const byAssigneeMap = new Map<string, { count: number; appoCount: number }>();
    let appoCount = 0;
    for (const c of calls) {
      const name = c.assignee?.name?.trim() || "（未設定）";
      const cur = byAssigneeMap.get(name) ?? { count: 0, appoCount: 0 };
      cur.count += 1;
      if (c.isAppointment) {
        cur.appoCount += 1;
        appoCount += 1;
      }
      byAssigneeMap.set(name, cur);
    }
    const byAssignee: AssigneeStat[] = Array.from(byAssigneeMap.entries()).map(
      ([assignee, { count, appoCount: ac }]) => ({ assignee, count, appoCount: ac })
    );
    byAssignee.sort((a, b) => b.count - a.count);
    return {
      byAssignee,
      total: calls.length,
      appoCount,
      appoRate: calls.length > 0 ? Math.round((appoCount / calls.length) * 1000) / 10 : null,
    };
  }

  const weekAgg = aggregate(weekCalls);
  const monthAgg = aggregate(monthCalls);

  return {
    byAssignee: monthAgg.byAssignee,
    weekTotal: weekAgg.total,
    weekAppoCount: weekAgg.appoCount,
    weekAppoRate: weekAgg.appoRate,
    monthTotal: monthAgg.total,
    monthAppoCount: monthAgg.appoCount,
    monthAppoRate: monthAgg.appoRate,
  };
}

export type PeriodStats = {
  count: number;
  goal: number | null;
  appoCount: number;
  appoRate: number | null;
  byAssignee: AssigneeStat[];
  label: string;
  periodType: "week" | "month";
  isCurrent: boolean;
};

export async function getPeriodStats(view: ViewPeriod): Promise<PeriodStats> {
  const range = getRangeForView(view);
  const ref = range.start;

  const [count, goalRow, calls] = await Promise.all([
    prisma.call.count({
      where: { createdAt: { gte: range.start, lte: range.end } },
    }),
    range.periodType === "week"
      ? prisma.goal.findUnique({
          where: { type_period: { type: "week", period: getWeekPeriod(ref) } },
        })
      : prisma.goal.findUnique({
          where: { type_period: { type: "month", period: getMonthPeriod(ref) } },
        }),
    prisma.call.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } },
      select: { assigneeId: true, assignee: { select: { name: true } }, isAppointment: true },
    }),
  ]);

  const byAssigneeMap = new Map<string, { count: number; appoCount: number }>();
  let appoCount = 0;
  for (const c of calls) {
    const name = c.assignee?.name?.trim() || "（未設定）";
    const cur = byAssigneeMap.get(name) ?? { count: 0, appoCount: 0 };
    cur.count += 1;
    if (c.isAppointment) {
      cur.appoCount += 1;
      appoCount += 1;
    }
    byAssigneeMap.set(name, cur);
  }
  const byAssignee: AssigneeStat[] = Array.from(byAssigneeMap.entries()).map(
    ([assignee, { count: n, appoCount: ac }]) => ({ assignee, count: n, appoCount: ac })
  );
  byAssignee.sort((a, b) => b.count - a.count);

  return {
    count,
    goal: goalRow?.value ?? null,
    appoCount,
    appoRate: calls.length > 0 ? Math.round((appoCount / calls.length) * 1000) / 10 : null,
    byAssignee,
    label: range.label,
    periodType: range.periodType,
    isCurrent: range.isCurrent,
  };
}

export type CustomPeriodStats = {
  count: number;
  appoCount: number;
  appoRate: number | null;
  byAssignee: AssigneeStat[];
  label: string;
};

export type DailyStat = {
  date: string; // YYYY-MM-DD
  label: string; // M/D
  count: number;
  appoCount: number;
};

/** 指定期間の日別架電数・アポ数。期間内の全日付を返す（0件の日も含む） */
export async function getDailyStats(start: Date, end: Date): Promise<DailyStat[]> {
  const calls = await prisma.call.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { createdAt: true, isAppointment: true },
  });

  const dayMap = new Map<string, { count: number; appoCount: number }>();
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur <= endDay) {
    const key =
      cur.getFullYear() +
      "-" +
      String(cur.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(cur.getDate()).padStart(2, "0");
    dayMap.set(key, { count: 0, appoCount: 0 });
    cur.setDate(cur.getDate() + 1);
  }

  for (const c of calls) {
    const d = new Date(c.createdAt);
    const key =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    const entry = dayMap.get(key);
    if (entry) {
      entry.count += 1;
      if (c.isAppointment) entry.appoCount += 1;
    }
  }

  const result: DailyStat[] = [];
  const iter = new Date(start);
  iter.setHours(0, 0, 0, 0);
  const endIter = new Date(end);
  endIter.setHours(0, 0, 0, 0);
  while (iter <= endIter) {
    const key =
      iter.getFullYear() +
      "-" +
      String(iter.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(iter.getDate()).padStart(2, "0");
    const { count, appoCount } = dayMap.get(key) ?? { count: 0, appoCount: 0 };
    result.push({
      date: key,
      label: `${iter.getMonth() + 1}/${iter.getDate()}`,
      count,
      appoCount,
    });
    iter.setDate(iter.getDate() + 1);
  }
  return result;
}

export async function getStatsForDateRange(
  start: Date,
  end: Date,
  label: string
): Promise<CustomPeriodStats> {
  const calls = await prisma.call.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { assigneeId: true, assignee: { select: { name: true } }, isAppointment: true },
  });

  const byAssigneeMap = new Map<string, { count: number; appoCount: number }>();
  let appoCount = 0;
  for (const c of calls) {
    const name = c.assignee?.name?.trim() || "（未設定）";
    const cur = byAssigneeMap.get(name) ?? { count: 0, appoCount: 0 };
    cur.count += 1;
    if (c.isAppointment) {
      cur.appoCount += 1;
      appoCount += 1;
    }
    byAssigneeMap.set(name, cur);
  }
  const byAssignee: AssigneeStat[] = Array.from(byAssigneeMap.entries()).map(
    ([assignee, { count: n, appoCount: ac }]) => ({ assignee, count: n, appoCount: ac })
  );
  byAssignee.sort((a, b) => b.count - a.count);

  return {
    count: calls.length,
    appoCount,
    appoRate: calls.length > 0 ? Math.round((appoCount / calls.length) * 1000) / 10 : null,
    byAssignee,
    label,
  };
}
