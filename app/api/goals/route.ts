import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWeekPeriod, getMonthPeriod } from "@/lib/dateUtils";

export async function GET() {
  const now = new Date();
  const weekPeriod = getWeekPeriod(now);
  const monthPeriod = getMonthPeriod(now);

  const [weekGoal, monthGoal] = await Promise.all([
    prisma.goal.findUnique({ where: { type_period: { type: "week", period: weekPeriod } } }),
    prisma.goal.findUnique({ where: { type_period: { type: "month", period: monthPeriod } } }),
  ]);

  return NextResponse.json({
    week: weekGoal ? weekGoal.value : null,
    month: monthGoal ? monthGoal.value : null,
    weekPeriod,
    monthPeriod,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { week, month, period, value } = body;

  const now = new Date();
  const weekPeriod = getWeekPeriod(now);
  const monthPeriod = getMonthPeriod(now);

  // 特定週の目標: { period: "2025-W12", value: 50 }
  if (typeof period === "string" && /^\d{4}-W\d{2}$/.test(period) && typeof value === "number" && value >= 0) {
    await prisma.goal.upsert({
      where: { type_period: { type: "week", period } },
      create: { type: "week", period, value },
      update: { value },
    });
    return NextResponse.json({ ok: true });
  }

  const updates: Promise<unknown>[] = [];
  if (typeof week === "number" && week >= 0) {
    updates.push(
      prisma.goal.upsert({
        where: { type_period: { type: "week", period: weekPeriod } },
        create: { type: "week", period: weekPeriod, value: week },
        update: { value: week },
      })
    );
  }
  if (typeof month === "number" && month >= 0) {
    updates.push(
      prisma.goal.upsert({
        where: { type_period: { type: "month", period: monthPeriod } },
        create: { type: "month", period: monthPeriod, value: month },
        update: { value: month },
      })
    );
  }

  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}
