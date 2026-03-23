import Link from "next/link";
import {
  getContractCounts,
  getContractGoals,
  getSalesConfig,
  getRecentContracts,
  getContractPlanTargetsForPeriod,
  getContractMonthExtra,
  projectedRevenueYen,
} from "@/lib/contracts";
import { getPricingMatrix, effectiveRevenueYenPerCourse } from "@/lib/pricingMatrix";
import {
  buildCourseTrialRows,
  sumPlanTargetCounts,
  planBasedGoalRevenueYenFromRows,
  planBasedGoalVariableTotalYenFromRows,
  profitAfterCostsYen,
  profitAfterFixedAndVariableTotal,
} from "@/lib/contractTrial";
import { ContractStatsHero } from "../components/ContractStatsHero";
import { GoalRemain } from "../components/GoalRemain";
import { AddContractForm } from "../components/AddContractForm";
import { ContractGoalsManager } from "../components/ContractGoalsManager";
import { SalesConfigForm } from "../components/SalesConfigForm";
import { PlansManagerPanel } from "../components/PlansManagerPanel";
import { MonthTrialSummary } from "../components/MonthTrialSummary";
import { PlanMonthTargetsPanel } from "../components/PlanMonthTargetsPanel";
import { ContractTrendsPanel } from "../components/ContractTrendsPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "契約・売上 | Nectere",
  description: "契約件数・目標・プラン単価・経費・利益試算・推移グラフ",
};

function formatYen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(
    n,
  );
}

function monthPeriodLabel(period: string) {
  const [y, m] = period.split("-");
  if (!y || !m) return period;
  return `${y}年${parseInt(m, 10)}月`;
}

export default async function ContractsPage() {
  const goals = await getContractGoals();
  const [counts, sales, contracts, pricingMatrix, planTargets, monthExtraFixed] = await Promise.all([
    getContractCounts(),
    getSalesConfig(),
    getRecentContracts(50),
    getPricingMatrix(),
    getContractPlanTargetsForPeriod(goals.monthPeriod),
    getContractMonthExtra(goals.monthPeriod),
  ]);

  const unit = sales.defaultRevenuePerContractYen;
  const weekRev = projectedRevenueYen(counts.weekCount, unit);
  const monthRev = projectedRevenueYen(counts.monthCount, unit);

  const targetMap = new Map(planTargets.map((t) => [t.courseId, t.targetCount]));
  const planRows = buildCourseTrialRows(
    pricingMatrix,
    targetMap,
    unit,
    sales.variableCostPerContractYen,
  );
  const sumPlan = sumPlanTargetCounts(planRows);
  const usePlanBreakdown = sumPlan > 0;
  const goalRevenueTrial = usePlanBreakdown
    ? planBasedGoalRevenueYenFromRows(planRows)
    : (goals.month ?? 0) * unit;
  const goalVariableTotal = usePlanBreakdown
    ? planBasedGoalVariableTotalYenFromRows(planRows)
    : (goals.month ?? 0) * sales.variableCostPerContractYen;
  const monthGoalMismatch =
    usePlanBreakdown && goals.month != null && sumPlan !== goals.month;
  const totalFixedThisMonth = sales.monthlyFixedExpenseYen + monthExtraFixed;
  const goalProfitTrial = profitAfterFixedAndVariableTotal(
    goalRevenueTrial,
    totalFixedThisMonth,
    goalVariableTotal,
  );
  const actualProfitTrial = profitAfterCostsYen(
    monthRev,
    counts.monthCount,
    totalFixedThisMonth,
    sales.variableCostPerContractYen,
  );

  const periodLabel = monthPeriodLabel(goals.monthPeriod);
  const coursesForTargets = pricingMatrix.courses.map((c) => ({
    id: c.id,
    name: c.name,
    revenueYen: effectiveRevenueYenPerCourse(pricingMatrix, c.id),
  }));

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
              ← ホーム
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">契約・売上試算</h1>
              <p className="text-xs font-medium text-zinc-400">契約ベース試算と料金表</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
              管理
            </Link>
            <AddContractForm />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <ContractStatsHero
          weekCount={counts.weekCount}
          monthCount={counts.monthCount}
          weekGoal={goals.week}
          monthGoal={goals.month}
        />

        <div>
          <GoalRemain
            weekCount={counts.weekCount}
            monthCount={counts.monthCount}
            weekGoal={goals.week}
            monthGoal={goals.month}
          />
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">今月の売上・利益試算</h2>
          <p className="mt-1 text-sm text-zinc-500">
            料金表のプラン単価・経費・目標件数から、{periodLabel}の実績と目標の試算をまとめて表示します。
          </p>
          <MonthTrialSummary
            periodLabel={periodLabel}
            monthCount={counts.monthCount}
            monthGoal={goals.month}
            defaultUnitYen={unit}
            baseFixedYen={sales.monthlyFixedExpenseYen}
            additionalFixedYen={monthExtraFixed}
            variablePerContractYen={sales.variableCostPerContractYen}
            usePlanBreakdown={usePlanBreakdown}
            planTargetSum={sumPlan}
            monthGoalMismatch={monthGoalMismatch}
            goalRevenueYen={goalRevenueTrial}
            goalProfitYen={goalProfitTrial}
            actualRevenueYen={monthRev}
            actualProfitYen={actualProfitTrial}
          />
          <PlanMonthTargetsPanel
            key={goals.monthPeriod}
            defaultPeriod={goals.monthPeriod}
            courses={coursesForTargets}
          />
        </section>

        <ContractTrendsPanel />

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">契約件数ベースの売上試算</h2>
          <p className="mt-1 text-sm text-zinc-500">
            週次の売上はここを参照。今月の利益は上の「今月の売上・利益試算」を参照してください。標準単価{" "}
            {formatYen(unit)} / 件（下のフォームで変更）。
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-semibold text-zinc-700">期間</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">契約数</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">試算売上</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">今週</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-800">{counts.weekCount} 件</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-zinc-900">{formatYen(weekRev)}</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">今月</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-800">{counts.monthCount} 件</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-zinc-900">{formatYen(monthRev)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-900">プラン（売上単価・変動経費）</h2>
          <p className="mt-1 text-sm text-zinc-500">
            モーダルでプランを追加・編集し、契約1件あたりの売上と変動経費をまとめて設定します。
          </p>
          <div className="mt-8">
            <PlansManagerPanel initial={pricingMatrix} />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">契約一覧（直近 50 件）</h2>
          {contracts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">まだ契約が登録されていません。</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-4 py-3 font-semibold text-zinc-700">締結日</th>
                    <th className="px-4 py-3 font-semibold text-zinc-700">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-100">
                      <td className="px-4 py-3 tabular-nums text-zinc-800">
                        {new Intl.DateTimeFormat("ja-JP", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(c.signedAt)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{c.memo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <SalesConfigForm />
          <ContractGoalsManager />
        </div>
      </main>
    </div>
  );
}
