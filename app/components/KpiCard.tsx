import type { KpiDashboardItem } from "@/lib/kpi";
import { formatKpiValue } from "@/lib/kpi";
import { KpiAchievementRing, KpiAchievementBar } from "./KpiAchievementRing";

type KpiCardProps = {
  item: KpiDashboardItem;
};

export function KpiCard({ item }: KpiCardProps) {
  const { target, actual, achievementRate } = item;
  const targetLabel = formatKpiValue(target, item.unit, item.dataSource);
  const actualLabel = formatKpiValue(actual, item.unit, item.dataSource);

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="shrink-0">
          <KpiAchievementRing rate={achievementRate} size={96} strokeWidth={9} label="達成率" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-zinc-900">{item.name}</h3>
          <p className="mt-0.5 text-xs text-zinc-400">{item.unit.name}</p>
          {(item.tags ?? []).length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(item.tags ?? []).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">目標</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">{targetLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">実績</p>
              <p
                className={`mt-0.5 text-xl font-bold tabular-nums ${
                  achievementRate != null && achievementRate >= 100 ? "text-emerald-600" : "text-zinc-900"
                }`}
              >
                {actualLabel}
              </p>
            </div>
          </div>

          {target != null && target > 0 && (
            <div className="mt-3">
              <KpiAchievementBar rate={achievementRate} />
              {achievementRate != null && achievementRate > 100 && (
                <p className="mt-1 text-xs font-semibold text-emerald-600">目標超過</p>
              )}
              {achievementRate != null && achievementRate === 100 && (
                <p className="mt-1 text-xs font-semibold text-emerald-600">目標達成</p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
