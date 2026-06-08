import type { ViewPeriod } from "@/lib/dateUtils";
import { getRangeForView } from "@/lib/dateUtils";
import { ensureDefaultUnits, getKpiDashboard, getPeriodFromView } from "@/lib/kpi";
import { KpiPageClient } from "../components/KpiPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "KPI | Nectere",
  description: "KPIの目標設定と実績管理",
};

const VIEWS: ViewPeriod[] = ["this-week", "last-week", "this-month", "last-month"];

export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await ensureDefaultUnits();

  const { view: viewParam } = await searchParams;
  const view: ViewPeriod =
    viewParam && VIEWS.includes(viewParam as ViewPeriod) ? (viewParam as ViewPeriod) : "this-week";

  const { periodType, period } = getPeriodFromView(view);
  const range = getRangeForView(view);
  const initialItems = await getKpiDashboard(periodType, period);

  return (
    <KpiPageClient
      initialItems={initialItems}
      initialPeriodType={periodType}
      initialPeriod={period}
      initialLabel={range.label}
    />
  );
}
