"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { HamburgerMenu } from "./HamburgerMenu";
import { getLastActionFromLogs } from "@/lib/customers";
import {
  LIST_SORT_PRESET_OPTIONS,
  type ListSortPreset,
  sortRowsByPreset,
} from "@/lib/customerLeadListSort";
import { LEAD_STATUS_OPTIONS, leadStatusChipClasses, leadStatusLabel } from "@/lib/leadStatus";
import { JAPAN_PREFECTURES } from "@/lib/japanPrefectures";
import { isValidLeadTagName, normalizeLeadTagName } from "@/lib/leadTags";

export type LeadTagLite = { id: string; name: string; color: string | null };

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
  tags: LeadTagLite[];
};

type Props = {
  initialLeads: LeadRowSerialized[];
  initialQ: string;
  initialStatus: string;
  initialPrefecture?: string;
  initialTagFilter?: string;
  initialAllTags: LeadTagLite[];
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

function leadTagChipClass(): string {
  return "inline-flex max-w-[140px] items-center truncate rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-900";
}

export function LeadsHome({
  initialLeads,
  initialQ,
  initialStatus,
  initialPrefecture = "",
  initialTagFilter = "",
  initialAllTags,
}: Props) {
  const router = useRouter();
  const [listSearch, setListSearch] = useState("");
  const [sortPreset, setSortPreset] = useState<ListSortPreset>("updated_desc");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkTagId, setBulkTagId] = useState("");
  const [bulkNewTag, setBulkNewTag] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const leadsWithTags = useMemo(
    () => initialLeads.map((r) => ({ ...r, tags: r.tags ?? [] })),
    [initialLeads],
  );

  const filtered = useMemo(() => {
    if (!listSearch.trim()) return leadsWithTags;
    const q = listSearch.trim().toLowerCase();
    return leadsWithTags.filter((row) => {
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
      const tagLine = row.tags.map((t) => t.name.toLowerCase()).join(" ");
      return (
        dest.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        memo.includes(q) ||
        pref.includes(q) ||
        addr.includes(q) ||
        em.includes(q) ||
        st.includes(q) ||
        lastLine.includes(q) ||
        tagLine.includes(q)
      );
    });
  }, [leadsWithTags, listSearch]);

  const sortedRows = useMemo(
    () => sortRowsByPreset(filtered, sortPreset),
    [filtered, sortPreset],
  );

  const allVisibleSelected =
    sortedRows.length > 0 && sortedRows.every((r) => selected.has(r.id));
  const someVisibleSelected = sortedRows.some((r) => selected.has(r.id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  async function applyBulkTag() {
    const leadIds = [...selected];
    const newName = normalizeLeadTagName(bulkNewTag);
    const tagId = bulkTagId.trim();
    if (!isValidLeadTagName(newName) && !tagId) {
      setBulkError("既存タグを選ぶか、新規タグ名を入力してください。");
      return;
    }
    setBulkSaving(true);
    setBulkError(null);
    try {
      const body =
        isValidLeadTagName(newName) && newName.length > 0
          ? { leadIds, tagName: newName }
          : { leadIds, tagId };
      const res = await fetch("/api/leads/bulk-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBulkError(data.error ?? `付与に失敗しました (${res.status})`);
        return;
      }
      setSelected(new Set());
      setBulkNewTag("");
      router.refresh();
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">営業先リスト</h1>
              <p className="text-xs font-medium text-zinc-400">左のチェックで選択し、タグを一括付与できます</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/leads/quick-add"
              className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-800 shadow-sm hover:bg-rose-50"
            >
              連続追加
            </Link>
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
            <div>
              <label htmlFor="lead-tag-filter" className="block text-sm font-medium text-zinc-700">
                タグ
              </label>
              <select
                id="lead-tag-filter"
                name="tag"
                defaultValue={initialTagFilter}
                className="mt-1 max-w-[200px] rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
              >
                <option value="">すべて</option>
                {initialAllTags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
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
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div>
              <label htmlFor="lead-list-filter" className="block text-sm font-medium text-zinc-700">
                一覧内の絞り込み
              </label>
              <input
                id="lead-list-filter"
                type="search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="表示中の一覧だけをさらに絞り込み（タグ名も対象）…"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="lead-sort" className="block text-sm font-medium text-zinc-700">
                表示順
              </label>
              <select
                id="lead-sort"
                value={sortPreset}
                onChange={(e) => setSortPreset(e.target.value as ListSortPreset)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
              >
                {LIST_SORT_PRESET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selected.size > 0 ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm ring-1 ring-rose-100">
            <div className="flex flex-wrap items-center gap-2 gap-y-2">
              <span className="text-sm font-semibold text-rose-950">{selected.size}件選択中</span>
              <button
                type="button"
                onClick={() => {
                  setSelected(new Set());
                  setBulkError(null);
                }}
                className="rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-900 hover:bg-rose-50"
              >
                選択を解除
              </button>
            </div>
            <p className="mt-2 text-xs text-rose-900/80">
              新規タグ名を入力するとそれを優先します（同名があれば既存タグに紐づきます）。空欄のときだけ下の「既存タグ」が使われます。
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[160px] flex-1">
                <label htmlFor="bulk-new-tag" className="block text-xs font-medium text-zinc-700">
                  新規タグ名（任意）
                </label>
                <input
                  id="bulk-new-tag"
                  type="text"
                  value={bulkNewTag}
                  onChange={(e) => {
                    setBulkNewTag(e.target.value);
                    setBulkError(null);
                  }}
                  placeholder="例: コール予定"
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label htmlFor="bulk-existing-tag" className="block text-xs font-medium text-zinc-700">
                  既存タグ
                </label>
                <select
                  id="bulk-existing-tag"
                  value={bulkTagId}
                  onChange={(e) => {
                    setBulkTagId(e.target.value);
                    setBulkError(null);
                  }}
                  className="mt-1 min-w-[180px] rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
                >
                  <option value="">選ぶ…</option>
                  {initialAllTags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => void applyBulkTag()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-60"
              >
                {bulkSaving ? "付与中…" : "タグを付与"}
              </button>
            </div>
            {bulkError ? (
              <p className="mt-2 text-sm font-medium text-red-700" role="alert">
                {bulkError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {initialLeads.length === 0 ? (
            <div className="space-y-3 px-4 py-10 text-center">
              <p className="text-sm text-zinc-500">リードがまだありません。</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/leads/quick-add"
                  className="inline-block rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50"
                >
                  連続で追加
                </Link>
                <Link
                  href="/leads/new"
                  className="inline-block rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  新規で追加
                </Link>
              </div>
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">該当するリードがありません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="w-10 px-2 py-3.5 align-middle">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={() => {
                          if (allVisibleSelected) {
                            setSelected(new Set());
                          } else {
                            setSelected(new Set(sortedRows.map((r) => r.id)));
                          }
                        }}
                        className="h-4 w-4 rounded border-zinc-400 text-rose-600 focus:ring-rose-500"
                        aria-label="表示中の一覧をすべて選択"
                      />
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">更新</th>
                    <th className="min-w-[140px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      最終アクション
                    </th>
                    <th className="min-w-[120px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      ステータス
                    </th>
                    <th className="min-w-[160px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      タグ
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
                  {sortedRows.map((row, idx) => {
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
                        <td
                          className="w-10 px-2 py-4 align-middle"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => {
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(row.id)) next.delete(row.id);
                                else next.add(row.id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-zinc-400 text-rose-600 focus:ring-rose-500"
                            aria-label={`${row.destination}を選択`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
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
                        <td className="max-w-[200px] px-5 py-4 align-top">
                          {row.tags.length === 0 ? (
                            <span className="text-zinc-300">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.tags.slice(0, 5).map((t) => (
                                <span key={t.id} className={leadTagChipClass()} title={t.name}>
                                  {t.name}
                                </span>
                              ))}
                              {row.tags.length > 5 ? (
                                <span className="self-center text-[11px] font-medium text-zinc-500">
                                  +{row.tags.length - 5}
                                </span>
                              ) : null}
                            </div>
                          )}
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
