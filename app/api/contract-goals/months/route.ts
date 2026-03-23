import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMonthPeriod } from "@/lib/dateUtils";

const MONTH_PERIOD_RE = /^\d{4}-\d{2}$/;

function periodsForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("year");
  const y = raw ? parseInt(raw, 10) : new Date().getFullYear();
  if (!Number.isFinite(y) || y < 2000 || y > 2100) {
    return NextResponse.json({ error: "invalid year" }, { status: 400 });
  }

  const periods = periodsForYear(y);
  const nowPeriod = getMonthPeriod(new Date());

  const [goals, extras] = await Promise.all([
    prisma.contractGoal.findMany({
      where: { type: "month", period: { in: periods } },
    }),
    prisma.contractMonthExtra.findMany({
      where: { period: { in: periods } },
    }),
  ]);

  const goalBy = Object.fromEntries(goals.map((g) => [g.period, g.value]));
  const extraBy = Object.fromEntries(extras.map((e) => [e.period, e.additionalFixedExpenseYen]));

  return NextResponse.json({
    year: y,
    months: periods.map((period) => {
      const monthNum = parseInt(period.slice(5), 10);
      return {
        period,
        label: `${y}年${monthNum}月`,
        isCurrent: period === nowPeriod,
        goal: goalBy[period] ?? null,
        additionalFixedExpenseYen: extraBy[period] ?? 0,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { period, goal, additionalFixedExpenseYen } = body;

  if (typeof period !== "string" || !MONTH_PERIOD_RE.test(period)) {
    return NextResponse.json({ error: "period must be YYYY-MM" }, { status: 400 });
  }

  if (goal === undefined && additionalFixedExpenseYen === undefined) {
    return NextResponse.json({ error: "goal or additionalFixedExpenseYen required" }, { status: 400 });
  }

  if (goal !== undefined) {
    if (typeof goal !== "number" || goal < 0 || !Number.isInteger(goal)) {
      return NextResponse.json({ error: "goal must be a non-negative integer" }, { status: 400 });
    }
    await prisma.contractGoal.upsert({
      where: { type_period: { type: "month", period } },
      create: { type: "month", period, value: goal },
      update: { value: goal },
    });
  }

  if (additionalFixedExpenseYen !== undefined) {
    if (
      typeof additionalFixedExpenseYen !== "number" ||
      additionalFixedExpenseYen < 0 ||
      !Number.isInteger(additionalFixedExpenseYen)
    ) {
      return NextResponse.json(
        { error: "additionalFixedExpenseYen must be a non-negative integer" },
        { status: 400 },
      );
    }
    await prisma.contractMonthExtra.upsert({
      where: { period },
      create: { period, additionalFixedExpenseYen },
      update: { additionalFixedExpenseYen },
    });
  }

  return NextResponse.json({ ok: true });
}
