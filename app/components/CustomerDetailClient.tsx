"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HamburgerMenu } from "./HamburgerMenu";
import { CustomerDestinationCombobox } from "./CustomerDestinationCombobox";
import { PrefectureInput } from "./PrefectureInput";
import { ActionLogAppendPanel } from "./ActionLogAppendPanel";
import { parseCustomerActionLogs } from "@/lib/customers";
import { buildCallsPrefillHref } from "@/lib/callPrefill";
import type { CustomerRowSerialized } from "./CustomersHome";

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
  initialCustomer: CustomerRowSerialized;
};

export function CustomerDetailClient({ initialCustomer }: Props) {
  const router = useRouter();
  const customer = initialCustomer;

  const logs = useMemo(() => parseCustomerActionLogs(customer.actionLogs), [customer.actionLogs]);

  const [dest, setDest] = useState(customer.destination);
  const [contactName, setContactName] = useState(customer.destinationContactName ?? "");
  const [contactKana, setContactKana] = useState(customer.destinationContactKana ?? "");
  const [phone, setPhone] = useState(customer.destinationPhone ?? "");
  const [prefecture, setPrefecture] = useState(customer.prefecture ?? "");
  const [addressLine, setAddressLine] = useState(customer.addressLine ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [memo, setMemo] = useState(customer.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDest(customer.destination);
    setContactName(customer.destinationContactName ?? "");
    setContactKana(customer.destinationContactKana ?? "");
    setPhone(customer.destinationPhone ?? "");
    setPrefecture(customer.prefecture ?? "");
    setAddressLine(customer.addressLine ?? "");
    setEmail(customer.email ?? "");
    setMemo(customer.memo ?? "");
    setSaveError(null);
  }, [customer.id, customer.updatedAt]);

  const callsPrefillHref = dest.trim()
    ? buildCallsPrefillHref({
        destination: dest,
        destinationContactName: contactName,
        destinationContactKana: contactKana,
        destinationPhone: phone,
        customerId: customer.id,
        memoLines: [
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
      const res = await fetch(`/api/customers/${customer.id}`, {
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

  const reversedLogs = useMemo(() => [...logs].reverse(), [logs]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">顧客詳細</h1>
              <p className="text-xs font-medium text-zinc-400">
                {dest.trim() || customer.destination}
                <span className="text-zinc-300"> · </span>
                更新 {formatDt(customer.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/customers"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              一覧へ戻る
            </Link>
            <Link href="/" className="text-xs font-semibold text-violet-700 underline-offset-2 hover:underline">
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
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">アクションログ</h2>
            {reversedLogs.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">まだ記録がありません。</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {reversedLogs.map((log, idx) => (
                  <li
                    key={`${log.date}-${idx}`}
                    className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"
                  >
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-900 px-1 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-900">{log.action}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{formatDt(log.date)}</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{log.memo}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <ActionLogAppendPanel patchUrl={`/api/customers/${customer.id}`} accent="violet" />
        </section>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">詳細情報を編集</h2>
            <form className="mt-3 space-y-3" onSubmit={handleSave}>
              {callsPrefillHref ? (
                <Link
                  href={callsPrefillHref}
                  className="flex w-full items-center justify-center rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-900 hover:bg-sky-100"
                >
                  架電の記録を開く（紐づけて記録）
                </Link>
              ) : null}

              <CustomerDestinationCombobox
                id="cust-detail-dest"
                label="電話先"
                value={dest}
                onChange={setDest}
                onPick={(row) => {
                  setDest(row.destination);
                  setContactName(row.destinationContactName?.trim() ?? "");
                  setContactKana(row.destinationContactKana?.trim() ?? "");
                  setPhone(row.destinationPhone ? sanitizePhoneInput(row.destinationPhone) : "");
                }}
                required
              />
              <div>
                <label className={labelForm} htmlFor="cust-detail-name">
                  担当者名
                </label>
                <input
                  id="cust-detail-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={inputForm}
                />
              </div>
              <div>
                <label className={labelForm} htmlFor="cust-detail-kana">
                  ふりがな
                </label>
                <input
                  id="cust-detail-kana"
                  value={contactKana}
                  onChange={(e) => setContactKana(e.target.value)}
                  className={inputForm}
                />
              </div>
              <div>
                <label className={labelForm} htmlFor="cust-detail-phone">
                  電話番号
                </label>
                <input
                  id="cust-detail-phone"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  className={inputForm}
                  type="tel"
                />
              </div>
              <PrefectureInput
                id="cust-detail-pref"
                label="都道府県"
                value={prefecture}
                onChange={setPrefecture}
                labelClassName={labelForm}
                className={inputForm}
              />
              <div>
                <label className={labelForm} htmlFor="cust-detail-address">
                  住所（番地・建物名など）
                </label>
                <input
                  id="cust-detail-address"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className={inputForm}
                  placeholder="市区町村以降"
                />
              </div>
              <div>
                <label className={labelForm} htmlFor="cust-detail-email">
                  メールアドレス
                </label>
                <input
                  id="cust-detail-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputForm}
                />
              </div>
              <div>
                <label className={labelForm} htmlFor="cust-detail-memo">
                  メモ
                </label>
                <textarea
                  id="cust-detail-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={5}
                  className={inputForm}
                />
              </div>

              {saveError ? (
                <p className="text-sm text-red-600" role="alert">
                  {saveError}
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
