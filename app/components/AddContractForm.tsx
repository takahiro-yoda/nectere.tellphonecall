"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function AddContractForm() {
  const router = useRouter();
  const [memo, setMemo] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setDefaultDate() {
    const now = new Date();
    setDateInput(
      now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0"),
    );
  }

  useEffect(() => {
    if (open) setDefaultDate();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedAt = dateInput ? new Date(`${dateInput}T12:00:00`).toISOString() : undefined;
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedAt,
          memo: memo.trim() || null,
        }),
      });
      if (!res.ok) {
        setError("登録に失敗しました");
        return;
      }
      setMemo("");
      setDefaultDate();
      router.refresh();
      setOpen(false);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
      >
        契約を記録
      </button>
      {open && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">契約を記録</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="contract-date" className="block text-sm font-medium text-zinc-700">
                  締結日
                </label>
                <input
                  id="contract-date"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="contract-memo" className="block text-sm font-medium text-zinc-700">
                  メモ（任意）
                </label>
                <textarea
                  id="contract-memo"
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="クライアント名など"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? "記録中…" : "記録"}
                </button>
              </div>
              {error && (
                <p className="pt-2 text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
