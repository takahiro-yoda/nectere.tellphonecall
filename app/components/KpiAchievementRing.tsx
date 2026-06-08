type KpiAchievementRingProps = {
  rate: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

function ringColor(rate: number | null): string {
  if (rate == null) return "#d4d4d8";
  if (rate >= 100) return "#10b981";
  if (rate >= 80) return "#52525b";
  return "#f59e0b";
}

export function KpiAchievementRing({
  rate,
  size = 88,
  strokeWidth = 8,
  label,
}: KpiAchievementRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const displayRate = rate ?? 0;
  const ringProgress = rate != null ? Math.min(rate, 100) : 0;
  const offset = circumference - (ringProgress / 100) * circumference;
  const color = ringColor(rate);
  const isOver = rate != null && rate > 100;

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        {isOver && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#34d399"
            strokeWidth={2}
            strokeOpacity={0.5}
            className="animate-pulse"
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-1"
        aria-hidden
      >
        <span
          className={`font-bold tabular-nums leading-none ${
            isOver ? "text-base text-emerald-600" : "text-lg"
          } ${rate != null && rate >= 100 && !isOver ? "text-emerald-600" : rate != null ? "text-zinc-900" : "text-zinc-400"}`}
        >
          {rate != null ? `${displayRate}%` : "—"}
        </span>
        {isOver && (
          <span className="mt-0.5 text-[9px] font-semibold text-emerald-600">超過</span>
        )}
        {label && !isOver && (
          <span className="mt-0.5 text-[10px] font-medium text-zinc-400">{label}</span>
        )}
      </div>
    </div>
  );
}

export function KpiAchievementBar({ rate }: { rate: number | null }) {
  const barWidth = rate != null ? Math.min(rate, 100) : 0;
  const isOver = rate != null && rate > 100;
  const color =
    rate == null
      ? "bg-zinc-200"
      : rate >= 100
        ? "bg-emerald-500"
        : rate >= 80
          ? "bg-zinc-600"
          : "bg-amber-500";

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${barWidth}%` }}
        />
        {isOver && (
          <div className="absolute inset-0 rounded-full bg-emerald-400/30 ring-1 ring-emerald-400/50" />
        )}
      </div>
      <span
        className={`min-w-[3rem] shrink-0 text-right text-xs font-bold tabular-nums ${
          isOver ? "text-emerald-600" : rate != null && rate >= 100 ? "text-emerald-600" : "text-zinc-700"
        }`}
      >
        {rate != null ? `${rate}%` : "—"}
      </span>
    </div>
  );
}
