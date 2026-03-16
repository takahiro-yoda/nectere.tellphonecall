/**
 * Get start and end of the week containing the given date.
 * Week starts on Monday (ISO 8601).
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get start and end of the month containing the given date.
 */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get ISO 8601 week number (1-53). Week 1 is the week with the year's first Thursday.
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7));
  const year = d.getFullYear();
  if (weekNo < 1) return { year: year - 1, week: 52 };
  if (weekNo > 52) {
    const nextYearStart = new Date(year + 1, 0, 1);
    const nextYearStartDay = nextYearStart.getDay() || 7;
    if (nextYearStartDay <= 4) return { year: year + 1, week: 1 };
    return { year, week: weekNo };
  }
  return { year, week: weekNo };
}

/**
 * Period identifier for week: "YYYY-Www" (e.g. "2025-W11")
 */
export function getWeekPeriod(date: Date): string {
  const { year, week } = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Period identifier for month: "YYYY-MM"
 */
export function getMonthPeriod(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export type ViewPeriod = "this-week" | "last-week" | "this-month" | "last-month";

export type PeriodRange = {
  start: Date;
  end: Date;
  label: string;
  periodType: "week" | "month";
  isCurrent: boolean;
};

/**
 * Get the reference date for a view (a date that falls in that period).
 */
export function getReferenceDate(view: ViewPeriod): Date {
  const now = new Date();
  if (view === "this-week" || view === "this-month") return now;
  if (view === "last-week") {
    const { start } = getWeekRange(now);
    const d = new Date(start);
    d.setDate(d.getDate() - 7);
    return d;
  }
  // last-month
  const { start } = getMonthRange(now);
  const d = new Date(start);
  d.setDate(0); // previous month's last day
  return d;
}

/**
 * Get date range and label for a view period.
 */
export function getRangeForView(view: ViewPeriod): PeriodRange {
  const ref = getReferenceDate(view);
  const isWeek = view === "this-week" || view === "last-week";
  const now = new Date();
  const isCurrent =
    (view === "this-week" && ref >= getWeekRange(now).start && ref <= getWeekRange(now).end) ||
    (view === "this-month" && ref >= getMonthRange(now).start && ref <= getMonthRange(now).end);

  if (isWeek) {
    const { start, end } = getWeekRange(ref);
    const label =
      view === "this-week" ? "今週" : `先週（${start.getMonth() + 1}/${start.getDate()}〜${end.getMonth() + 1}/${end.getDate()}）`;
    return { start, end, label, periodType: "week", isCurrent };
  } else {
    const { start, end } = getMonthRange(ref);
    const label =
      view === "this-month"
        ? "今月"
        : `先月（${start.getFullYear()}年${start.getMonth() + 1}月）`;
    return { start, end, label, periodType: "month", isCurrent };
  }
}

/**
 * Get N weeks around a center date (each item: period, label, isCurrent).
 * Label format: "今週" for current week, else "M/D〜M/D" (e.g. "3/17〜3/23").
 */
export function getWeeksAround(
  centerDate: Date,
  weeksBefore: number,
  weeksAfter: number
): { period: string; label: string; isCurrent: boolean }[] {
  const { start: currentStart } = getWeekRange(centerDate);
  const result: { period: string; label: string; isCurrent: boolean }[] = [];
  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    const d = new Date(currentStart);
    d.setDate(d.getDate() + i * 7);
    const { start, end } = getWeekRange(d);
    const period = getWeekPeriod(d);
    const isCurrent = i === 0;
    const label = isCurrent
      ? "今週"
      : `${start.getMonth() + 1}/${start.getDate()}〜${end.getMonth() + 1}/${end.getDate()}`;
    result.push({ period, label, isCurrent });
  }
  return result;
}

/**
 * Parse YYYY-MM-DD strings and return date range (start 00:00:00, end 23:59:59).
 * Returns null if invalid or start > end.
 */
export function parseCustomDateRange(
  fromStr: string,
  toStr: string
): { start: Date; end: Date; label: string } | null {
  if (!fromStr || !toStr || typeof fromStr !== "string" || typeof toStr !== "string") return null;
  const from = fromStr.trim();
  const to = toStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T23:59:59.999");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  const label =
    from === to
      ? `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()}`
      : `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()}〜${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}`;
  return { start, end, label };
}
