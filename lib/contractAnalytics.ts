import { prisma } from "@/lib/db";
import { getPricingMatrix } from "@/lib/pricingMatrix";
import {
  buildCourseTrialRows,
  planBasedGoalRevenueYenFromRows,
  planBasedGoalVariableTotalYenFromRows,
  sumPlanTargetCounts,
} from "@/lib/contractTrial";

export type MonthTrendRow = {
  period: string;
  label: string;
  contractCount: number;
  revenueYen: number;
  fixedYen: number;
  variableYen: number;
  profitYen: number;
  usedPlanBreakdown: boolean;
  monthGoal: number | null;
  planBreakdown: {
    courseId: string;
    name: string;
    targetCount: number;
    revenueYen: number;
    variableYen: number;
  }[];
};

export type YearSummary = {
  year: number;
  contractCount: number;
  revenueYen: number;
  fixedYen: number;
  variableYen: number;
  profitYen: number;
};

type SalesLike = {
  defaultRevenuePerContractYen: number;
  monthlyFixedExpenseYen: number;
  variableCostPerContractYen: number;
};

export async function getMonthTrendRowsForYear(year: number, sales: SalesLike): Promise<MonthTrendRow[]> {
  const [matrix, goals, extras, targets] = await Promise.all([
    getPricingMatrix(),
    prisma.contractGoal.findMany({
      where: { type: "month", period: { startsWith: `${year}-` } },
      select: { period: true, value: true },
    }),
    prisma.contractMonthExtra.findMany({
      where: { period: { startsWith: `${year}-` } },
      select: { period: true, additionalFixedExpenseYen: true },
    }),
    prisma.contractPlanTarget.findMany({
      where: { period: { startsWith: `${year}-` } },
      select: { period: true, courseId: true, targetCount: true },
    }),
  ]);

  const goalBy = Object.fromEntries(goals.map((g) => [g.period, g.value]));
  const extraBy = Object.fromEntries(extras.map((e) => [e.period, e.additionalFixedExpenseYen]));
  const targetsByPeriod = new Map<string, Map<string, number>>();
  for (const t of targets) {
    const map = targetsByPeriod.get(t.period) ?? new Map<string, number>();
    map.set(t.courseId, t.targetCount);
    targetsByPeriod.set(t.period, map);
  }

  const rows: MonthTrendRow[] = [];
  for (let m = 1; m <= 12; m++) {
    const period = `${year}-${String(m).padStart(2, "0")}`;
    const periodTargets = targetsByPeriod.get(period) ?? new Map<string, number>();
    const planRows = buildCourseTrialRows(
      matrix,
      periodTargets,
      sales.defaultRevenuePerContractYen,
      sales.variableCostPerContractYen,
    );
    const planCount = sumPlanTargetCounts(planRows);
    const monthGoal = goalBy[period];
    const useMonthGoal = monthGoal != null;
    const contractCount = useMonthGoal ? monthGoal : planCount;
    const revenueYen =
      !useMonthGoal && planCount > 0
        ? planBasedGoalRevenueYenFromRows(planRows)
        : contractCount * sales.defaultRevenuePerContractYen;
    const fixedYen = sales.monthlyFixedExpenseYen + (extraBy[period] ?? 0);
    const variableYen =
      !useMonthGoal && planCount > 0
        ? planBasedGoalVariableTotalYenFromRows(planRows)
        : contractCount * sales.variableCostPerContractYen;
    const profitYen = revenueYen - fixedYen - variableYen;
    const planBreakdown = planRows
      .filter((r) => r.targetCount > 0)
      .map((r) => ({
        courseId: r.courseId,
        name: r.name,
        targetCount: r.targetCount,
        revenueYen: r.rowRevenueYen,
        variableYen: r.variableTotalYen,
      }));
    rows.push({
      period,
      label: `${m}月`,
      contractCount,
      revenueYen,
      fixedYen,
      variableYen,
      profitYen,
      usedPlanBreakdown: !useMonthGoal && planCount > 0,
      monthGoal: monthGoal ?? null,
      planBreakdown,
    });
  }
  return rows;
}

export async function getYearSummary(year: number, sales: SalesLike): Promise<YearSummary> {
  const months = await getMonthTrendRowsForYear(year, sales);
  return months.reduce(
    (acc, r) => ({
      year,
      contractCount: acc.contractCount + r.contractCount,
      revenueYen: acc.revenueYen + r.revenueYen,
      fixedYen: acc.fixedYen + r.fixedYen,
      variableYen: acc.variableYen + r.variableYen,
      profitYen: acc.profitYen + r.profitYen,
    }),
    {
      year,
      contractCount: 0,
      revenueYen: 0,
      fixedYen: 0,
      variableYen: 0,
      profitYen: 0,
    },
  );
}

export async function getAnnualSummaries(fromYear: number, toYear: number, sales: SalesLike): Promise<YearSummary[]> {
  const out: YearSummary[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    out.push(await getYearSummary(y, sales));
  }
  return out;
}
