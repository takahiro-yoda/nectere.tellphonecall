import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCallMemo } from "@/lib/callFlow";
import { getRangeForView, parseCustomDateRange } from "@/lib/dateUtils";

type ViewKey = "all" | "day" | "week" | "month" | "year" | "custom";

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = value ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i > 0 ? i : fallback;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getYearRange(year: number): { start: Date; end: Date } {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function getDayRange(dayStr: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayStr)) return null;
  const [y, m, d] = dayStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = (searchParams.get("view") ?? "month") as ViewKey;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const dayParam = searchParams.get("day");
  const yearParam = searchParams.get("year");

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = clampInt(parsePositiveInt(searchParams.get("pageSize"), 50), 10, 200);
  const skip = (page - 1) * pageSize;

  let range: { start: Date; end: Date } | null = null;
  if (view === "custom") {
    if (fromParam != null && toParam != null) {
      range = parseCustomDateRange(fromParam, toParam);
      if (!range) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    } else {
      return NextResponse.json({ error: "from/to required" }, { status: 400 });
    }
  } else if (view === "day") {
    if (!dayParam) return NextResponse.json({ error: "day required" }, { status: 400 });
    const r = getDayRange(dayParam);
    if (!r) return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    range = r;
  } else if (view === "week") {
    range = getRangeForView("this-week");
  } else if (view === "month") {
    range = getRangeForView("this-month");
  } else if (view === "year") {
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();
    if (!Number.isFinite(year) || year < 2000 || year > 2100) return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    range = getYearRange(year);
  } else if (view === "all") {
    range = null;
  } else {
    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  }

  const where = range ? { createdAt: { gte: range.start, lte: range.end } } : undefined;

  const [total, calls] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        destination: true,
        destinationContactName: true,
        destinationPhone: true,
        memo: true,
        assigneeId: true,
        assignee: { select: { id: true, name: true, color: true } },
        callTypeId: true,
        callType: { select: { id: true, name: true } },
        isAppointment: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const items = calls.map((call) => {
    const parsed = parseCallMemo(call.memo);
    return { ...call, memo: parsed.memoText, scriptFlow: parsed.scriptFlow };
  });

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    pageCount: total === 0 ? 1 : Math.ceil(total / pageSize),
  });
}

