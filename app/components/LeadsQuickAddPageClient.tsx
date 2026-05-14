"use client";

import Link from "next/link";
import { HamburgerMenu } from "./HamburgerMenu";
import { LeadsQuickAddPanel } from "./LeadsQuickAddPanel";

export function LeadsQuickAddPageClient() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">リード連続追加</h1>
              <p className="text-xs text-zinc-500">電話先と都道府県のみ。同じ画面で続けて登録できます</p>
            </div>
          </div>
          <Link href="/leads" className="text-xs font-semibold text-rose-800 underline-offset-2 hover:underline">
            一覧へ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-4 text-sm leading-relaxed text-zinc-600">
          「追加して次へ」で保存したあと、電話先欄だけ空きます。都道府県はそのまま残るので、同じ県への連続登録がしやすくなっています。
        </p>
        <LeadsQuickAddPanel hideIntro />
        <p className="mt-6 text-center text-xs text-zinc-500">
          担当者・電話・メモなども入れたい場合は{" "}
          <Link href="/leads/new" className="font-semibold text-rose-800 underline-offset-2 hover:underline">
            新規リード
          </Link>
          から登録してください。
        </p>
      </main>
    </div>
  );
}
