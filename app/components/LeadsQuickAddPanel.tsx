"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerDestinationCombobox } from "./CustomerDestinationCombobox";
import { PrefectureInput } from "./PrefectureInput";

const DEST_INPUT_ID = "leads-quick-add-destination";

export function LeadsQuickAddPanel() {
  const router = useRouter();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dest, setDest] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dest.trim()) {
      setError("電話先を入力してください");
      return;
    }
    if (!prefecture.trim()) {
      setError("県（都道府県）を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: dest.trim(),
          prefecture: prefecture.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `追加に失敗しました (${res.status})`);
        return;
      }
      setDest("");
      setToast("追加しました。続けて入力できます。");
      router.refresh();
      window.requestAnimationFrame(() => {
        document.getElementById(DEST_INPUT_ID)?.focus();
      });
      toastTimer.current = setTimeout(() => {
        setToast(null);
        toastTimer.current = null;
      }, 3200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-label="リードを連続で追加"
      className="mb-4 rounded-2xl border border-rose-200 bg-white p-4 shadow-sm ring-1 ring-rose-50"
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-900">連続で新規追加</h2>
        <p className="text-xs text-zinc-500">電話先と都道府県を入れて追加。送信後は電話先だけクリアされます（同じ県の連続入力向け）。</p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,180px)_auto] sm:items-end">
        <CustomerDestinationCombobox
          id={DEST_INPUT_ID}
          label="電話先（必須）"
          value={dest}
          onChange={setDest}
          suggestionsPath="/api/leads/suggestions"
          placeholder="会社名など"
          required
          inputClassName="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
        />
        <PrefectureInput
          id="leads-quick-add-prefecture"
          label="都道府県（必須）"
          value={prefecture}
          onChange={setPrefecture}
          labelClassName="block text-sm font-medium text-zinc-700"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-60 sm:mb-[2px] sm:self-end"
        >
          {saving ? "追加中…" : "追加して次へ"}
        </button>
      </form>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {toast ? (
        <p className="mt-2 text-sm font-medium text-emerald-700" role="status">
          {toast}
        </p>
      ) : null}
    </section>
  );
}
