"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { HamburgerMenu } from "./HamburgerMenu";
import { getLastActionFromLogs } from "@/lib/customers";
import { LEAD_STATUS_OPTIONS, leadStatusChipClasses, leadStatusLabel } from "@/lib/leadStatus";
import { JAPAN_PREFECTURES } from "@/lib/japanPrefectures";

export type LeadRowSerialized = {
  id: string;
  destination: string;
  destinationContactName: string | null;
  destinationContactKana: string | null;
  destinationPhone: string | null;
  prefecture: string | null;
  addressLine: string | null;
  email: string | null;
  memo: string | null;
  actionLogs: unknown;
  urls?: unknown;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialLeads: LeadRowSerialized[];
  initialQ: string;
  initialStatus: string;
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

function formatActionLogDate(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
    return {
      date: d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      time: d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return { date: iso, time: "" };
  }
}

export function LeadsHome({
  initialLeads,
  initialQ,
  initialStatus,
  initialPrefecture = "",
}: Props) {
  const router = useRouter();
  const [listSearch, setListSearch] = useState("");

  const filtered = useMemo(() => {
    if (!listSearch.trim()) return initialLeads;
    const q = listSearch.trim().toLowerCase();
    return initialLeads.filter((row) => {
      const dest = row.destination.toLowerCase();
      const contact = (row.destinationContactName ?? "").toLowerCase();
      const phone = (row.destinationPhone ?? "").toLowerCase();
      const memo = (row.memo ?? "").toLowerCase();
      const pref = (row.prefecture ?? "").toLowerCase();
      const addr = (row.addressLine ?? "").toLowerCase();
      const em = (row.email ?? "").toLowerCase();
      const st = leadStatusLabel(row.status).toLowerCase();
      const last = getLastActionFromLogs(row.actionLogs);
      const lastLine = last
        ? `${last.action} ${last.memoPreview}`.toLowerCase()
        : "";
      return (
        dest.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        memo.includes(q) ||
        pref.includes(q) ||
        addr.includes(q) ||
        em.includes(q) ||
        st.includes(q) ||
        lastLine.includes(q)
      );
    });
  }, [initialLeads, listSearch]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">営業先リスト</h1>
              <p className="text-xs font-medium text-zinc-400">行をタップして詳細ページへ</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/leads/new"
              className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
            >
              新規リード
            </Link>
            <Link href="/" className="text-xs font-semibold text-rose-800 underline-offset-2 hover:underline">
              ホームへ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <form className="flex flex-wrap items-end gap-2" action="/leads" method="get">
            <div className="min-w-[140px] flex-1">
              <label htmlFor="lead-q" className="block text-sm font-medium text-zinc-700">
                検索（サーバー）
              </label>
              <input
                id="lead-q"
                name="q"
                type="search"
                defaultValue={initialQ}
                placeholder="電話先・担当者・電話・メール・住所"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="lead-pref-filter" className="block text-sm font-medium text-zinc-700">
                都道府県
              </label>
              <select
                id="lead-pref-filter"
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
            <div>
              <label htmlFor="lead-status-filter" className="block text-sm font-medium text-zinc-700">
                ステータス
              </label>
              <select
                id="lead-status-filter"
                name="status"
                defaultValue={initialStatus}
                className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
              >
                <option value="">すべて</option>
                {LEAD_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              絞り込み
            </button>
          </form>
          <div>
            <label htmlFor="lead-list-filter" className="block text-sm font-medium text-zinc-700">
              一覧内の絞り込み
            </label>
            <input
              id="lead-list-filter"
              type="search"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="表示中の一覧だけをさらに絞り込み…"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {initialLeads.length === 0 ? (
            <div className="space-y-3 px-4 py-10 text-center">
              <p className="text-sm text-zinc-500">リードがまだありません。</p>
              <Link
                href="/leads/new"
                className="inline-block rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                新規で追加
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">該当するリードがありません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">更新</th>
                    <th className="min-w-[140px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      最終アクション
                    </th>
                    <th className="min-w-[120px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      ステータス
                    </th>
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
                    const lastAct = getLastActionFromLogs(row.actionLogs);
                    const lastActFmt = lastAct ? formatActionLogDate(lastAct.date) : null;
                    const detailLine =
                      [row.prefecture, row.destinationContactName, row.destinationPhone, row.email]
                        .filter(Boolean)
                        .join(" · ") || "—";
                    return (
                      <tr
                        key={row.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/leads/${row.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/leads/${row.id}`);
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
                        <td className="max-w-[200px] px-5 py-4 text-sm text-zinc-600">
                          {lastAct && lastActFmt ? (
                            <>
                              <div className="font-medium text-zinc-800">
                                {lastActFmt.date}
                                {lastActFmt.time ? (
                                  <span className="ml-1 text-xs font-normal text-zinc-500">{lastActFmt.time}</span>
                                ) : null}
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-600" title={`${lastAct.action} — ${lastAct.memoPreview}`}>
                                <span className="font-semibold text-zinc-700">{lastAct.action}</span>
                                {lastAct.memoPreview.trim() ? (
                                  <span className="text-zinc-500"> · {lastAct.memoPreview}</span>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={leadStatusChipClasses(row.status)}>{leadStatusLabel(row.status)}</span>
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
