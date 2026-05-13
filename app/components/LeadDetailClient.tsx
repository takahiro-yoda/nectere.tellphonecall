"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { HamburgerMenu } from "./HamburgerMenu";
import { CustomerDestinationCombobox } from "./CustomerDestinationCombobox";
import { PrefectureInput } from "./PrefectureInput";
import { ActionLogAppendPanel } from "./ActionLogAppendPanel";
import { ActionLogHistorySection } from "./ActionLogHistorySection";
import { RecordUrlsEditor } from "./RecordUrlsEditor";
import { parseRecordUrls } from "@/lib/extraUrls";
import { LEAD_STATUS_OPTIONS, leadStatusChipClasses, leadStatusLabel } from "@/lib/leadStatus";
import { buildCallsPrefillHref } from "@/lib/callPrefill";
import type { LeadRowSerialized } from "./LeadsHome";

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "");
}

function displayField(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  return t || "未設定";
}

const labelForm = "block text-sm font-medium text-zinc-700";
const inputForm = "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900";

type Props = {
  initialLead: LeadRowSerialized;
};

export function LeadDetailClient({ initialLead }: Props) {
  const router = useRouter();
  const lead = initialLead;

  const [dest, setDest] = useState(lead.destination);
  const [contactName, setContactName] = useState(lead.destinationContactName ?? "");
  const [contactKana, setContactKana] = useState(lead.destinationContactKana ?? "");
  const [phone, setPhone] = useState(lead.destinationPhone ?? "");
  const [prefecture, setPrefecture] = useState(lead.prefecture ?? "");
  const [addressLine, setAddressLine] = useState(lead.addressLine ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [memo, setMemo] = useState(lead.memo ?? "");
  const [urlList, setUrlList] = useState(() => parseRecordUrls((lead as { urls?: unknown }).urls));
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [saving, setSaving] = useState(false);
  const [migrateSaving, setMigrateSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictCustomerId, setConflictCustomerId] = useState<string | null>(null);

  useEffect(() => {
    setDest(lead.destination);
    setContactName(lead.destinationContactName ?? "");
    setContactKana(lead.destinationContactKana ?? "");
    setPhone(lead.destinationPhone ?? "");
    setPrefecture(lead.prefecture ?? "");
    setAddressLine(lead.addressLine ?? "");
    setEmail(lead.email ?? "");
    setMemo(lead.memo ?? "");
    setUrlList(parseRecordUrls((lead as { urls?: unknown }).urls));
    setStatus(lead.status);
    setSaveError(null);
    setConflictCustomerId(null);
  }, [lead.id, lead.updatedAt]);

  const callsPrefillHref = dest.trim()
    ? buildCallsPrefillHref({
        destination: dest,
        destinationContactName: contactName,
        destinationContactKana: contactKana,
        destinationPhone: phone,
        leadId: lead.id,
        memoLines: [
          `（営業先リスト）ステータス: ${leadStatusLabel(status)}`,
          prefecture.trim() ? `都道府県: ${prefecture.trim()}` : "",
          addressLine.trim() ? `住所: ${addressLine.trim()}` : "",
          email.trim() ? `メール: ${email.trim()}` : "",
          memo.trim() ? `メモ: ${memo.trim()}` : "",
        ].filter(Boolean),
      })
    : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
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
          urls: urlList,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(data.error ?? `保存に失敗しました (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleMigrateToCustomer() {
    if (
      !confirm(
        "このリードを顧客データベースへ移行しますか？\n連絡先・住所・メモ・アクションログを引き継ぎ、営業先リストからは削除されます。",
      )
    ) {
      return;
    }
    setMigrateSaving(true);
    setSaveError(null);
    setConflictCustomerId(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert-to-customer`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        customerId?: string;
        error?: string;
        existingCustomerId?: string;
      };
      if (!res.ok) {
        if (res.status === 409 && data.existingCustomerId) {
          setConflictCustomerId(data.existingCustomerId);
          setSaveError(data.error ?? "同一の顧客が既に登録されています。");
          return;
        }
        setSaveError(data.error ?? `移行に失敗しました (${res.status})`);
        return;
      }
      if (data.customerId) {
        setConflictCustomerId(null);
        router.push(`/customers/${encodeURIComponent(data.customerId)}`);
        router.refresh();
      }
    } finally {
      setMigrateSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">営業先詳細</h1>
              <p className="text-xs font-medium text-zinc-400">
                {dest.trim() || lead.destination}
                <span className="text-zinc-300"> · </span>
                更新 {formatDt(lead.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/leads"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              一覧へ戻る
            </Link>
            <Link href="/" className="text-xs font-semibold text-rose-800 underline-offset-2 hover:underline">
              ホームへ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.1fr,360px]">
        <section className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">ステータス</div>
                <div className="mt-1">
                  <span className={leadStatusChipClasses(status)}>{leadStatusLabel(status)}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">電話先</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{displayField(dest)}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">担当者名</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{displayField(contactName)}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">ふりがな</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{displayField(contactKana)}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">電話番号</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{displayField(phone)}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">都道府県</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{displayField(prefecture)}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">住所</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{displayField(addressLine)}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">メール</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{displayField(email)}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-medium tracking-wide text-zinc-500">メモ</div>
                <div className="mt-1 line-clamp-4 text-sm font-semibold text-zinc-900 whitespace-pre-wrap">
                  {memo.trim() ? memo : "未設定"}
                </div>
              </div>
              {urlList.length > 0 ? (
                <div className="sm:col-span-2">
                  <div className="text-xs font-medium tracking-wide text-zinc-500">リンク</div>
                  <ul className="mt-2 space-y-1.5">
                    {urlList.map((u) => (
                      <li key={u}>
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
                        >
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <ActionLogHistorySection actionLogsRaw={lead.actionLogs} patchUrl={`/api/leads/${lead.id}`} />

          <ActionLogAppendPanel patchUrl={`/api/leads/${lead.id}`} accent="rose" />
        </section>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">詳細情報を編集</h2>
            <form className="mt-3 space-y-3" onSubmit={handleSave}>
              <button
                type="button"
                onClick={() => void handleMigrateToCustomer()}
                disabled={migrateSaving || saving}
                className="w-full rounded-lg border border-violet-300 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                {migrateSaving ? "移行処理中…" : "顧客データベースへ移行"}
              </button>

              {callsPrefillHref ? (
                <Link
                  href={callsPrefillHref}
                  className="flex w-full items-center justify-center rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-900 hover:bg-sky-100"
                >
                  架電の記録を開く（紐づけて記録）
                </Link>
              ) : null}

              <div>
                <label className={labelForm} htmlFor="lead-detail-status">
                  ステータス
                </label>
                <select
                  id="lead-detail-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className={inputForm}
                >
                  {LEAD_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-zinc-500">保存後のタグ色プレビュー</p>
                <span className={`mt-1 ${leadStatusChipClasses(status)}`}>{leadStatusLabel(status)}</span>
              </div>

              <CustomerDestinationCombobox
                id="lead-detail-dest"
                label="電話先"
                value={dest}
                onChange={setDest}
                suggestionsPath="/api/leads/suggestions"
                onPick={(row) => {
                  setDest(row.destination);
                  setContactName(row.destinationContactName?.trim() ?? "");
                  setContactKana(row.destinationContactKana?.trim() ?? "");
                  setPhone(row.destinationPhone ? sanitizePhoneInput(row.destinationPhone) : "");
                }}
                required
              />
              <div>
                <label className={labelForm} htmlFor="lead-detail-name">
                  担当者名
                </label>
                <input
                  id="lead-detail-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={inputForm}
                />
              </div>
              <div>
                <label className={labelForm} htmlFor="lead-detail-kana">
                  ふりがな
                </label>
                <input
                  id="lead-detail-kana"
                  value={contactKana}
                  onChange={(e) => setContactKana(e.target.value)}
                  className={inputForm}
                />
              </div>
              <div>
                <label className={labelForm} htmlFor="lead-detail-phone">
                  電話番号
                </label>
                <input
                  id="lead-detail-phone"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  className={inputForm}
                  type="tel"
                />
              </div>
              <PrefectureInput
                id="lead-detail-pref"
                label="都道府県"
                value={prefecture}
                onChange={setPrefecture}
                labelClassName={labelForm}
                className={inputForm}
              />
              <div>
                <label className={labelForm} htmlFor="lead-detail-address">
                  住所（番地・建物名など）
                </label>
                <input
                  id="lead-detail-address"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className={inputForm}
                  placeholder="市区町村以降"
                />
              </div>
              <div>
                <label className={labelForm} htmlFor="lead-detail-email">
                  メールアドレス
                </label>
                <input
                  id="lead-detail-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputForm}
                />
              </div>
              <div>
                <label className={labelForm} htmlFor="lead-detail-memo">
                  メモ
                </label>
                <textarea
                  id="lead-detail-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={5}
                  className={inputForm}
                />
              </div>
              <div>
                <span className={labelForm}>リンク（任意）</span>
                <div className="mt-2">
                  <RecordUrlsEditor urls={urlList} onChange={setUrlList} accent="rose" />
                </div>
              </div>

              {saveError ? (
                <p className="text-sm text-red-600" role="alert">
                  {saveError}
                  {conflictCustomerId ? (
                    <>
                      {" "}
                      <Link
                        href={`/customers/${encodeURIComponent(conflictCustomerId)}`}
                        className="font-semibold text-violet-700 underline"
                      >
                        既存の顧客を開く
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className="mt-1 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </form>
          </section>
        </aside>
      </main>
    </div>
  );
}
