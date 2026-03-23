import Link from "next/link";
import { getCounts } from "@/lib/calls";
import { getContractCounts } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ホーム | Nectere",
  description: "Nectere の各ダッシュボードへの入口",
};

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3v18M6 8v13M16 13v8M21 6v15" />
    </svg>
  );
}

function IconSliders({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
      />
    </svg>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

export default async function HomeHubPage() {
  const [callCounts, contractCounts] = await Promise.all([getCounts(), getContractCounts()]);

  const stats = [
    { label: "今週の架電", value: callCounts.weekCount, suffix: "件", accent: "from-sky-400 to-cyan-300" },
    { label: "今月の架電", value: callCounts.monthCount, suffix: "件", accent: "from-violet-400 to-fuchsia-300" },
    { label: "今週の契約", value: contractCounts.weekCount, suffix: "件", accent: "from-amber-400 to-orange-300" },
    { label: "今月の契約", value: contractCounts.monthCount, suffix: "件", accent: "from-emerald-400 to-teal-300" },
  ];

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="relative overflow-hidden border-b border-zinc-800/80 bg-zinc-950 text-zinc-100">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(56,189,248,0.15) 0%, transparent 45%),
              radial-gradient(circle at 80% 0%, rgba(167,139,250,0.12) 0%, transparent 40%),
              linear-gradient(to bottom, rgba(24,24,27,0.2), rgba(9,9,11,0.95))`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] [background-size:48px_48px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pb-20 sm:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Operations hub</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">Nectere</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            架電の記録から契約・プラン別の売上試算まで、チームの数字をこのひとつの入口から辿れます。
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:border-zinc-700"
              >
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.accent} opacity-20 blur-2xl transition group-hover:opacity-30`}
                />
                <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-white">{s.value}</span>
                  <span className="text-sm text-zinc-500">{s.suffix}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">ダッシュボード</h2>
            <p className="mt-1 text-sm text-zinc-600">目的の画面を選んでください</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
          <Link
            href="/calls"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-8 shadow-sm transition lg:col-span-7 lg:min-h-[280px] lg:p-10 hover:border-zinc-300 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100 transition group-hover:scale-[1.03]">
                <IconPhone className="h-7 w-7" />
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition group-hover:border-zinc-300 group-hover:text-zinc-700">
                <ArrowRight className="h-5 w-5 -translate-x-0.5 transition group-hover:translate-x-0" />
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-2xl font-bold tracking-tight text-zinc-900">架電ダッシュボード</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
                架電数・アポ率・応答率、担当者別の内訳と電話先一覧。日次チャートで期間を切り替えて確認できます。
              </p>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-sky-600">Open metrics →</p>
          </Link>

          <div className="flex flex-col gap-5 lg:col-span-5">
            <Link
              href="/contracts"
              className="group flex flex-1 flex-col rounded-3xl border border-zinc-200/90 bg-white p-7 shadow-sm transition hover:border-amber-200/80 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800 ring-1 ring-amber-100">
                  <IconChart className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300 transition group-hover:text-amber-700" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-zinc-900">契約・売上試算</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                目標とのギャップ、プラン別単価、月次の売上・利益推移グラフまで。
              </p>
            </Link>

            <Link
              href="/admin"
              className="group flex items-center gap-5 rounded-3xl border border-zinc-200/90 bg-white px-7 py-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                <IconSliders className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-zinc-900">管理</h3>
                <p className="mt-0.5 text-sm text-zinc-600">架電目標・担当者タグ</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300 group-hover:text-zinc-600" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
