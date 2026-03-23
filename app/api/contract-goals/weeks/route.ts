import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWeeksAround } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const weeks = getWeeksAround(now, 2, 2);
  const periodList = weeks.map((w) => w.period);

  const goals = await prisma.contractGoal.findMany({
    where: { type: "week", period: { in: periodList } },
  });
  const valueByPeriod = Object.fromEntries(goals.map((g) => [g.period, g.value]));

  const list = weeks.map((w) => ({
    period: w.period,
    label: w.label,
    isCurrent: w.isCurrent,
    value: valueByPeriod[w.period] ?? null,
  }));

  return NextResponse.json(list);
}
