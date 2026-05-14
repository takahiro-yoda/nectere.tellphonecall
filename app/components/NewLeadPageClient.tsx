"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { HamburgerMenu } from "./HamburgerMenu";
import { CustomerDestinationCombobox } from "./CustomerDestinationCombobox";
import { PrefectureInput } from "./PrefectureInput";
import { LEAD_STATUS_OPTIONS, leadStatusChipClasses, leadStatusLabel } from "@/lib/leadStatus";

function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function NewLeadPageClient() {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>("RESEARCHING");
  const [dest, setDest] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactKana, setContactKana] = useState("");
  const [phone, setPhone] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [email, setEmail] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dest.trim()) {
      setError("電話先を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: dest.trim(),
          destinationContactName: contactName.trim() || null,
          destinationContactKana: contactKana.trim() || null,
          destinationPhone: phone.trim() || null,
          prefecture: prefecture.trim() || null,
          addressLine: addressLine.trim() || null,
          email: email.trim() || null,
          memo: memo.trim() || null,
          status,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `作成に失敗しました (${res.status})`);
        return;
      }
      if (data.id) {
        router.push(`/leads/${encodeURIComponent(data.id)}`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">新規リード</h1>
              <p className="text-xs text-zinc-500">登録後、一覧で詳細を編集できます</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-x-3 gap-y-1">
            <Link
              href="/leads/quick-add"
              className="text-xs font-semibold text-rose-700 underline-offset-2 hover:underline"
            >
              電話先＋県だけ連続追加
            </Link>
            <Link href="/leads" className="text-xs font-semibold text-rose-800 underline-offset-2 hover:underline">
              一覧へ戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-rose-200 bg-white p-6 shadow-sm ring-1 ring-rose-100"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="new-page-lead-status">
              ステータス
            </label>
            <select
              id="new-page-lead-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            >
              {LEAD_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-zinc-500">プレビュー</p>
            <span className={`mt-1 ${leadStatusChipClasses(status)}`}>{leadStatusLabel(status)}</span>
          </div>
          <CustomerDestinationCombobox
            id="new-page-lead-dest"
            label="電話先（必須）"
            value={dest}
            onChange={setDest}
            suggestionsPath="/api/leads/suggestions"
            onPick={(row) => {
              setDest(row.destination);
              setContactName(row.destinationContactName?.trim() ?? "");
              setContactKana(row.destinationContactKana?.trim() ?? "");
              setPhone(row.destinationPhone ? sanitizePhoneInput(row.destinationPhone) : "");
            }}
            placeholder="会社名・担当者名など"
            required
          />
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="new-page-lead-name">
              担当者名
            </label>
            <input
              id="new-page-lead-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="new-page-lead-kana">
              ふりがな
            </label>
            <input
              id="new-page-lead-kana"
              value={contactKana}
              onChange={(e) => setContactKana(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="new-page-lead-phone">
              電話番号
            </label>
            <input
              id="new-page-lead-phone"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <PrefectureInput id="new-page-lead-pref" label="都道府県" value={prefecture} onChange={setPrefecture} />
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="new-page-lead-address">
              住所（番地・建物名など）
            </label>
            <input
              id="new-page-lead-address"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              placeholder="市区町村以降"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="new-page-lead-email">
              メールアドレス
            </label>
            <input
              id="new-page-lead-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="new-page-lead-memo">
              メモ
            </label>
            <textarea
              id="new-page-lead-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Link
              href="/leads"
              className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {saving ? "作成中…" : "登録する"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
