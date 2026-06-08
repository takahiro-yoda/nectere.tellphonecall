"use client";

import { HamburgerMenu } from "./HamburgerMenu";
import { KpiDashboard } from "./KpiDashboard";
import { KpiPeriodEditor } from "./KpiPeriodEditor";
import { KpiDefinitionsManager } from "./KpiDefinitionsManager";
import { KpiUnitsManager } from "./KpiUnitsManager";
import type { KpiDashboardItem } from "@/lib/kpi";

type KpiPageClientProps = {
  initialItems: KpiDashboardItem[];
  initialPeriodType: "week" | "month";
  initialPeriod: string;
  initialLabel: string;
};

export function KpiPageClient({
  initialItems,
  initialPeriodType,
  initialPeriod,
  initialLabel,
}: KpiPageClientProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">KPI</h1>
              <p className="text-xs font-medium text-zinc-400">目標と実績の管理</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <KpiDashboard
          initialItems={initialItems}
          initialPeriodType={initialPeriodType}
          initialPeriod={initialPeriod}
          initialLabel={initialLabel}
        />
        <KpiPeriodEditor />
        <div className="space-y-8">
          <KpiDefinitionsManager />
          <KpiUnitsManager />
        </div>
      </main>
    </div>
  );
}
