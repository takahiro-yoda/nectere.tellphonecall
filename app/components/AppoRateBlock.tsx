type PropsSingle = {
  label: string;
  appoRate: number | null;
  appoCount: number;
  total: number;
  weekAppoRate?: never;
  monthAppoRate?: never;
  weekAppoCount?: never;
  monthAppoCount?: never;
  weekTotal?: never;
  monthTotal?: never;
};

type PropsDual = {
  label?: never;
  appoRate?: never;
  appoCount?: never;
  total?: never;
  weekAppoRate: number | null;
  monthAppoRate: number | null;
  weekAppoCount: number;
  monthAppoCount: number;
  weekTotal: number;
  monthTotal: number;
};

export function AppoRateBlock(
  props: PropsSingle | PropsDual
) {
  if ("label" in props && props.label != null) {
    const { label, appoRate, appoCount, total } = props;
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">アポ率</h2>
        <div className="mt-4">
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="text-4xl font-bold tabular-nums text-zinc-900">
            {appoRate != null ? `${appoRate}%` : "—"}
          </p>
          <p className="text-xs text-zinc-400">
            {total > 0 ? `${appoCount}件 / ${total}件` : "架電なし"}
          </p>
        </div>
      </section>
    );
  }
  const { weekAppoRate, monthAppoRate, weekAppoCount, monthAppoCount, weekTotal, monthTotal } = props;
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-zinc-900">アポ率</h2>
      <div className="mt-4 flex flex-wrap gap-8 sm:gap-12">
        <div className="flex flex-col">
          <p className="text-sm text-zinc-500">今週</p>
          <p className="text-4xl font-bold tabular-nums text-zinc-900">
            {weekAppoRate != null ? `${weekAppoRate}%` : "—"}
          </p>
          <p className="text-xs text-zinc-400">
            {weekTotal > 0 ? `${weekAppoCount}件 / ${weekTotal}件` : "架電なし"}
          </p>
        </div>
        <div className="h-12 w-px bg-zinc-200 self-center" aria-hidden />
        <div className="flex flex-col">
          <p className="text-sm text-zinc-500">今月</p>
          <p className="text-4xl font-bold tabular-nums text-zinc-900">
            {monthAppoRate != null ? `${monthAppoRate}%` : "—"}
          </p>
          <p className="text-xs text-zinc-400">
            {monthTotal > 0 ? `${monthAppoCount}件 / ${monthTotal}件` : "架電なし"}
          </p>
        </div>
      </div>
    </section>
  );
}
