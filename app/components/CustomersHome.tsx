"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HamburgerMenu } from "./HamburgerMenu";
import { JAPAN_PREFECTURES } from "@/lib/japanPrefectures";

export type CustomerRowSerialized = {
  id: string;
  matchKey: string;
  destination: string;
  destinationContactName: string | null;
  destinationContactKana: string | null;
  destinationPhone: string | null;
  prefecture: string | null;
  addressLine: string | null;
  email: string | null;
  memo: string | null;
  actionLogs: unknown;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialCustomers: CustomerRowSerialized[];
  initialQ: string;
  searchFormAction?: string;
  initialPrefecture?: string;
};

function formatRowDate(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      time: d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return { date: iso, time: "" };
  }
}

export function CustomersHome({
  initialCustomers,
  initialQ,
  searchFormAction = "/customers",
  initialPrefecture = "",
}: Props) {
  const router = useRouter();
  const [listSearch, setListSearch] = useState("");

  const filtered = useMemo(() => {
    if (!listSearch.trim()) return initialCustomers;
    const q = listSearch.trim().toLowerCase();
    return initialCustomers.filter((row) => {
      const dest = row.destination.toLowerCase();
      const contact = (row.destinationContactName ?? "").toLowerCase();
      const phone = (row.destinationPhone ?? "").toLowerCase();
      const memo = (row.memo ?? "").toLowerCase();
      const pref = (row.prefecture ?? "").toLowerCase();
      const addr = (row.addressLine ?? "").toLowerCase();
      const em = (row.email ?? "").toLowerCase();
      return (
        dest.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        memo.includes(q) ||
        pref.includes(q) ||
        addr.includes(q) ||
        em.includes(q)
      );
    });
  }, [initialCustomers, listSearch]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">顧客データベース</h1>
              <p className="text-xs font-medium text-zinc-400">行をタップして詳細ページへ</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/customers/new"
              className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-500"
            >
              新規顧客
            </Link>
            <Link href="/" className="text-xs font-semibold text-violet-700 underline-offset-2 hover:underline">
              ホームへ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <form className="flex flex-wrap items-end gap-2" action={searchFormAction} method="get">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="cust-q" className="block text-sm font-medium text-zinc-700">
                検索（サーバー）
              </label>
              <input
                id="cust-q"
                name="q"
                type="search"
                defaultValue={initialQ}
                placeholder="電話先・担当者・電話・メール・住所"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="cust-pref" className="block text-sm font-medium text-zinc-700">
                都道府県
              </label>
              <select
                id="cust-pref"
                name="prefecture"
                defaultValue={initialPrefecture}
                className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
              >
                <option value="">すべて</option>
                {JAPAN_PREFECTURES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              検索
            </button>
          </form>
          <div>
            <label htmlFor="cust-list-filter" className="block text-sm font-medium text-zinc-700">
              一覧内の絞り込み
            </label>
            <input
              id="cust-list-filter"
              type="search"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="表示中の一覧だけをさらに絞り込み…"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {initialCustomers.length === 0 ? (
            <div className="space-y-3 px-4 py-10 text-center">
              <p className="text-sm text-zinc-500">顧客がまだありません。架電を記録すると自動で追加されます。</p>
              <Link
                href="/customers/new"
                className="inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
              >
                新規で追加
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">該当する顧客がありません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">更新</th>
                    <th className="min-w-[180px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      電話先
                    </th>
                    <th className="min-w-[200px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      詳細情報
                    </th>
                    <th className="min-w-[200px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      メモ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const { date, time } = formatRowDate(row.updatedAt);
                    const detailLine =
                      [row.prefecture, row.destinationContactName, row.destinationPhone, row.email]
                        .filter(Boolean)
                        .join(" · ") || "—";
                    return (
                      <tr
                        key={row.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/customers/${row.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/customers/${row.id}`);
                          }
                        }}
                        className={`cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50/70 ${
                          idx % 2 === 1 ? "bg-zinc-50/40" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-zinc-500">
                          <span className="block font-medium text-zinc-700">{date}</span>
                          {time ? <span className="text-xs">{time}</span> : null}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-base font-semibold text-zinc-900 underline-offset-2 transition hover:text-zinc-700 hover:underline">
                            {row.destination}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-700">
                          <span className="line-clamp-2" title={detailLine}>
                            {detailLine}
                          </span>
                        </td>
                        <td className="max-w-[260px] px-5 py-4">
                          {row.memo?.trim() ? (
                            <span className="line-clamp-2 text-sm leading-relaxed text-zinc-600" title={row.memo}>
                              {row.memo}
                            </span>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
