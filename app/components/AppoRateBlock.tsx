type PropsSingle = {
  label: string;
  appoRate: number | null;
  appoCount: number;
  total: number;
  responseRate?: number | null;
  responseCount?: number;
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
  weekResponseRate: number | null;
  monthResponseRate: number | null;
  weekNoAnswerCount: number;
  monthNoAnswerCount: number;
};

export function AppoRateBlock(
  props: PropsSingle | PropsDual
) {
  if ("label" in props && props.label != null) {
    const { label, appoRate, appoCount, total, responseRate, responseCount } = props;
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">アポ率・応答率</h2>
        <div className="mt-4">
          <p className="text-sm text-zinc-500">{label}</p>
          <div className="mt-3 space-y-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-emerald-700">アポ率</span>
                <span className="text-4xl font-bold tabular-nums text-zinc-900">
                  {appoRate != null ? `${appoRate}%` : "—"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {total > 0 ? `アポ ${appoCount}件 / 架電 ${total}件` : "架電なし"}
              </p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-sky-700">応答率</span>
                <span className="text-xl font-semibold tabular-nums text-zinc-900">
                  {responseRate != null ? `${responseRate}%` : "—"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {total > 0 && responseCount != null
                  ? `応答 ${responseCount}件 / 架電 ${total}件`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }
  const {
    weekAppoRate,
    monthAppoRate,
    weekAppoCount,
    monthAppoCount,
    weekTotal,
    monthTotal,
    weekResponseRate,
    monthResponseRate,
    weekNoAnswerCount,
    monthNoAnswerCount,
  } = props;
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-zinc-900">アポ率・応答率</h2>
      <div className="mt-4 flex flex-wrap gap-8 sm:gap-12">
        <div className="flex flex-col">
          <p className="text-sm text-zinc-500">今週</p>
          <div className="mt-2 space-y-1.5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-emerald-700">アポ率</span>
                <span className="text-3xl font-bold tabular-nums text-zinc-900">
                  {weekAppoRate != null ? `${weekAppoRate}%` : "—"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {weekTotal > 0 ? `アポ ${weekAppoCount}件 / 架電 ${weekTotal}件` : "架電なし"}
              </p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-sky-700">応答率</span>
                <span className="text-xl font-semibold tabular-nums text-zinc-900">
                  {weekResponseRate != null ? `${weekResponseRate}%` : "—"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {weekTotal > 0
                  ? `応答 ${weekTotal - weekNoAnswerCount}件 / 架電 ${weekTotal}件`
                  : "架電なし"}
              </p>
            </div>
          </div>
        </div>
        <div className="h-12 w-px bg-zinc-200 self-center" aria-hidden />
        <div className="flex flex-col">
          <p className="text-sm text-zinc-500">今月</p>
          <div className="mt-2 space-y-1.5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-emerald-700">アポ率</span>
                <span className="text-3xl font-bold tabular-nums text-zinc-900">
                  {monthAppoRate != null ? `${monthAppoRate}%` : "—"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {monthTotal > 0 ? `アポ ${monthAppoCount}件 / 架電 ${monthTotal}件` : "架電なし"}
              </p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-sky-700">応答率</span>
                <span className="text-xl font-semibold tabular-nums text-zinc-900">
                  {monthResponseRate != null ? `${monthResponseRate}%` : "—"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {monthTotal > 0
                  ? `応答 ${monthTotal - monthNoAnswerCount}件 / 架電 ${monthTotal}件`
                  : "架電なし"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
