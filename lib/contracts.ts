import { prisma } from "@/lib/db";
import { getWeekRange, getMonthRange, getWeekPeriod, getMonthPeriod } from "@/lib/dateUtils";

const SALES_CONFIG_ID = "default";

export async function ensureSalesConfig() {
  return prisma.salesConfig.upsert({
    where: { id: SALES_CONFIG_ID },
    create: {
      id: SALES_CONFIG_ID,
      defaultRevenuePerContractYen: 0,
      monthlyFixedExpenseYen: 0,
      variableCostPerContractYen: 0,
    },
    update: {},
  });
}

export async function getSalesConfig() {
  const row = await prisma.salesConfig.findUnique({ where: { id: SALES_CONFIG_ID } });
  if (row) return row;
  return ensureSalesConfig();
}

export async function getContractCounts(date: Date = new Date()) {
  const { start: weekStart, end: weekEnd } = getWeekRange(date);
  const { start: monthStart, end: monthEnd } = getMonthRange(date);

  const [weekCount, monthCount] = await Promise.all([
    prisma.contract.count({ where: { signedAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.contract.count({ where: { signedAt: { gte: monthStart, lte: monthEnd } } }),
  ]);

  return { weekCount, monthCount };
}

export async function getContractGoals(date: Date = new Date()) {
  const weekPeriod = getWeekPeriod(date);
  const monthPeriod = getMonthPeriod(date);

  const [weekGoal, monthGoal] = await Promise.all([
    prisma.contractGoal.findUnique({ where: { type_period: { type: "week", period: weekPeriod } } }),
    prisma.contractGoal.findUnique({ where: { type_period: { type: "month", period: monthPeriod } } }),
  ]);

  return {
    week: weekGoal?.value ?? null,
    month: monthGoal?.value ?? null,
    weekPeriod,
    monthPeriod,
  };
}

export function projectedRevenueYen(count: number, yenPerContract: number) {
  return count * yenPerContract;
}

export async function getRecentContracts(limit: number = 50) {
  return prisma.contract.findMany({
    orderBy: { signedAt: "desc" },
    take: limit,
  });
}

export async function getContractPlanTargetsForPeriod(period: string) {
  return prisma.contractPlanTarget.findMany({
    where: { period },
  });
}

export async function getContractMonthExtra(period: string) {
  const row = await prisma.contractMonthExtra.findUnique({ where: { period } });
  return row?.additionalFixedExpenseYen ?? 0;
}
