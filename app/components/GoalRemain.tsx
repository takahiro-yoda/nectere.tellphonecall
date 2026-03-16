type GoalRemainSingle = {
  count: number;
  goal: number | null;
  label: string;
  isCurrent: boolean;
};

type GoalRemainDual = {
  weekCount: number;
  monthCount: number;
  weekGoal: number | null;
  monthGoal: number | null;
};

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ProgressCard({
  label,
  count,
  goal,
  isCurrent,
}: {
  label: string;
  count: number;
  goal: number;
  isCurrent: boolean;
}) {
  const remain = Math.max(0, goal - count);
  const done = count >= goal;
  const pct = goal > 0 ? Math.min(100, Math.round((count / goal) * 100)) : 0;

  const barFillClass = done
    ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
    : pct >= 80
      ? "bg-gradient-to-r from-amber-300 to-amber-500"
      : pct >= 50
        ? "bg-gradient-to-r from-amber-200 to-amber-400"
        : "bg-gradient-to-r from-slate-300 to-slate-400";

  const encouragement =
    !done && isCurrent && remain > 0
      ? remain <= 2
        ? "もう一息！"
        : remain <= 5
          ? "ラストスパート！"
          : null
      : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl px-6 py-5 transition-all duration-300 ${
        done
          ? "border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white shadow-lg shadow-emerald-100/50"
          : "border border-zinc-200/80 bg-white shadow-md shadow-zinc-100"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {!done && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold tabular-nums text-zinc-600">
              {pct}%
            </span>
          )}
          {done && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md shadow-emerald-500/30">
              <CheckIcon />
              達成！
            </span>
          )}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-extrabold tabular-nums tracking-tight ${done ? "text-emerald-700" : "text-zinc-900"}`}>
          {count}
        </span>
        <span className="text-zinc-300">/</span>
        <span className="text-lg font-semibold tabular-nums text-zinc-500">目標 {goal}</span>
        <span className="text-sm text-zinc-400">件</span>
      </div>
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barFillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {encouragement && (
        <p className="mt-3 text-sm font-bold text-amber-600">{encouragement}</p>
      )}
      {!done && isCurrent && !encouragement && (
        <p className="mt-3 text-sm font-medium text-zinc-500">
          あと <strong className="tabular-nums text-zinc-800">{remain}</strong> 件でゴール
        </p>
      )}
      {!done && isCurrent && encouragement && (
        <p className="mt-1 text-sm text-zinc-500">
          あと <strong className="tabular-nums text-zinc-700">{remain}</strong> 件
        </p>
      )}
      {!done && !isCurrent && (
        <p className="mt-3 text-sm text-zinc-500">
          {pct}% 達成
        </p>
      )}
    </div>
  );
}

function NoGoalCard({ label, isCurrent }: { label: string; isCurrent: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/30 px-6 py-5">
      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <p className="mt-3 text-sm text-zinc-500">
        {isCurrent ? "管理画面で目標を設定すると進捗が表示されます" : "目標未設定"}
      </p>
    </div>
  );
}

export function GoalRemain(props: GoalRemainSingle | GoalRemainDual) {
  if ("label" in props) {
    const { count, goal, label, isCurrent } = props;
    if (goal == null) {
      return (
        <section className="rounded-xl">
          <NoGoalCard label={label} isCurrent={isCurrent} />
        </section>
      );
    }
    return (
      <section className="rounded-xl">
        <ProgressCard label={label} count={count} goal={goal} isCurrent={isCurrent} />
      </section>
    );
  }

  const { weekCount, monthCount, weekGoal, monthGoal } = props;

  if (weekGoal == null && monthGoal == null) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/30 px-6 py-6 text-center">
        <p className="text-sm text-zinc-500">
          管理画面で目標を設定すると、達成度がビジュアルで表示されます。
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-5 sm:grid-cols-2">
      {weekGoal != null ? (
        <ProgressCard
          label="今週"
          count={weekCount}
          goal={weekGoal}
          isCurrent={true}
        />
      ) : (
        <NoGoalCard label="今週" isCurrent={true} />
      )}
      {monthGoal != null ? (
        <ProgressCard
          label="今月"
          count={monthCount}
          goal={monthGoal}
          isCurrent={true}
        />
      ) : (
        <NoGoalCard label="今月" isCurrent={true} />
      )}
    </section>
  );
}
