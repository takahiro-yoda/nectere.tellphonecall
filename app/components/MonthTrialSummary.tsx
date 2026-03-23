type Props = {
  periodLabel: string;
  monthCount: number;
  monthGoal: number | null;
  defaultUnitYen: number;
  /** SalesConfig の共通月次固定経費 */
  baseFixedYen: number;
  /** その月だけ上乗せする経費 */
  additionalFixedYen: number;
  variablePerContractYen: number;
  usePlanBreakdown: boolean;
  planTargetSum: number;
  monthGoalMismatch: boolean;
  goalRevenueYen: number;
  goalProfitYen: number;
  actualRevenueYen: number;
  actualProfitYen: number;
};

function formatYen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);
}

function profitClass(n: number) {
  if (n < 0) return "text-red-700";
  if (n > 0) return "text-emerald-800";
  return "text-zinc-700";
}

export function MonthTrialSummary({
  periodLabel,
  monthCount,
  monthGoal,
  defaultUnitYen,
  baseFixedYen,
  additionalFixedYen,
  variablePerContractYen,
  usePlanBreakdown,
  planTargetSum,
  monthGoalMismatch,
  goalRevenueYen,
  goalProfitYen,
  actualRevenueYen,
  actualProfitYen,
}: Props) {
  const totalFixedYen = baseFixedYen + additionalFixedYen;
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600">
        <p>
          <span className="font-medium text-zinc-800">前提：</span>
          実績の売上は「今月の契約件数 × 標準単価（{formatYen(defaultUnitYen)} / 件）」です。契約にプランが紐づいていないため、実績のプラン別内訳は出しません。
        </p>
        <p className="mt-2">
          目標の売上は、下の「プラン別・月ごとの目標件数」の
          <strong className="font-medium text-zinc-800"> 当月分</strong>に
          <strong className="font-medium text-zinc-800"> 1 件でも入っている場合</strong>
          は、その合計で試算します。すべて 0 のときは「月の契約目標 × 標準単価」です。プラン行の単価は料金表セルの
          <strong className="font-medium text-zinc-800"> 平均</strong>、空欄だけの行は標準単価を使います。
        </p>
        <p className="mt-2">
          利益 ＝ 売上 − 固定経費合計 {formatYen(totalFixedYen)}（共通 {formatYen(baseFixedYen)}
          {additionalFixedYen > 0 ? `、今月の追加 ${formatYen(additionalFixedYen)}` : ""}）− 変動費合計。実績は
          <strong className="font-medium text-zinc-800"> 件数 × {formatYen(variablePerContractYen)}</strong>
          。目標でプラン別内訳を使うときは、
          <strong className="font-medium text-zinc-800"> 各プランの変動経費（未設定はこの単価）</strong>
          で積み上げます。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/80">実績ベース（今月）</p>
          <p className="mt-1 text-sm text-zinc-600">
            契約 <span className="font-semibold tabular-nums text-zinc-900">{monthCount}</span> 件
          </p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900">{formatYen(actualRevenueYen)}</p>
          <p className="text-xs text-zinc-500">試算売上</p>
          <p className={`mt-3 text-xl font-bold tabular-nums ${profitClass(actualProfitYen)}`}>
            {formatYen(actualProfitYen)}
          </p>
          <p className="text-xs text-zinc-500">試算利益（粗利イメージ）</p>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-900/80">目標ベース（{periodLabel}）</p>
          {usePlanBreakdown ? (
            <p className="mt-1 text-sm text-zinc-600">
              プラン別目標の合計{" "}
              <span className="font-semibold tabular-nums text-zinc-900">{planTargetSum}</span> 件
              {monthGoal != null && (
                <>
                  {" "}
                  （月目標 <span className="tabular-nums">{monthGoal}</span> 件）
                </>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">
              月の契約目標{" "}
              <span className="font-semibold tabular-nums text-zinc-900">{monthGoal ?? "—"}</span>
              {monthGoal == null ? " 件（未設定）" : " 件"}
            </p>
          )}
          {monthGoalMismatch && (
            <p className="mt-2 rounded-lg bg-amber-100/80 px-2 py-1 text-xs text-amber-950">
              プラン別の合計件数が「月の契約目標」と一致していません。どちらかに合わせて調整してください。
            </p>
          )}
          <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900">{formatYen(goalRevenueYen)}</p>
          <p className="text-xs text-zinc-500">目標達成時・試算売上</p>
          <p className={`mt-3 text-xl font-bold tabular-nums ${profitClass(goalProfitYen)}`}>
            {formatYen(goalProfitYen)}
          </p>
          <p className="text-xs text-zinc-500">目標達成時・試算利益</p>
        </div>
      </div>
    </div>
  );
}
