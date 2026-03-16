type StatsHeroProps =
  | { periodLabel: string; count: number; weekCount?: never; monthCount?: never; weekGoal?: null; monthGoal?: null }
  | {
      periodLabel?: never;
      count?: never;
      weekCount: number;
      monthCount: number;
      weekGoal: number | null;
      monthGoal: number | null;
    };

export function StatsHero(props: StatsHeroProps) {
  if ("periodLabel" in props && props.periodLabel != null) {
    return (
      <section className="py-8">
        <p className="text-center text-lg font-medium text-zinc-500">{props.periodLabel}の架電数</p>
        <p className="mt-2 text-center text-7xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-8xl">
          {props.count}
        </p>
        <p className="text-center text-sm text-zinc-400">件</p>
      </section>
    );
  }
  const { weekCount, monthCount, weekGoal, monthGoal } = props;

  const weekRemain = weekGoal != null ? Math.max(0, weekGoal - weekCount) : null;
  const monthRemain = monthGoal != null ? Math.max(0, monthGoal - monthCount) : null;
  const weekDone = weekGoal != null && weekCount >= weekGoal;
  const monthDone = monthGoal != null && monthCount >= monthGoal;

  return (
    <section className="flex flex-col items-center gap-10 py-8 sm:flex-row sm:justify-center sm:gap-20">
      <div className="flex flex-col items-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">今週の架電数</p>
        <p className={`mt-2 text-7xl font-extrabold tabular-nums tracking-tight sm:text-8xl ${weekDone ? "text-emerald-600" : "text-zinc-900"}`}>
          {weekCount}
        </p>
        <p className="text-sm text-zinc-400">件</p>
        {weekGoal != null && (
          <div className="mt-2">
            {weekDone ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                目標達成
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                あと <span className="ml-0.5 tabular-nums">{weekRemain}</span> 件
              </span>
            )}
          </div>
        )}
      </div>
      <div className="hidden h-28 w-px bg-gradient-to-b from-transparent via-zinc-200 to-transparent sm:block" aria-hidden />
      <div className="flex flex-col items-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">今月の架電数</p>
        <p className={`mt-2 text-7xl font-extrabold tabular-nums tracking-tight sm:text-8xl ${monthDone ? "text-emerald-600" : "text-zinc-900"}`}>
          {monthCount}
        </p>
        <p className="text-sm text-zinc-400">件</p>
        {monthGoal != null && (
          <div className="mt-2">
            {monthDone ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                目標達成
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                あと <span className="ml-0.5 tabular-nums">{monthRemain}</span> 件
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
