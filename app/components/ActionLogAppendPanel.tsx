"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const QUICK_ACTIONS = ["架電", "メール送付", "訪問", "面談", "資料送付", "フォロー"] as const;

function toDatetimeLocalValue(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  /** 例: `/api/customers/cuid` または `/api/leads/cuid` */
  patchUrl: string;
  /** 見た目の差別化（顧客=violet, リード=rose） */
  accent: "violet" | "rose";
};

const accentRing: Record<Props["accent"], string> = {
  violet: "border-violet-200 bg-violet-50/50 ring-violet-100",
  rose: "border-rose-200 bg-rose-50/50 ring-rose-100",
};

const chipActive: Record<Props["accent"], string> = {
  violet: "border-violet-500 bg-violet-100 text-violet-950",
  rose: "border-rose-500 bg-rose-100 text-rose-950",
};

const chipIdle: Record<Props["accent"], string> = {
  violet: "border-zinc-200 bg-white text-zinc-800 hover:border-violet-300 hover:bg-violet-50/80",
  rose: "border-zinc-200 bg-white text-zinc-800 hover:border-rose-300 hover:bg-rose-50/80",
};

export function ActionLogAppendPanel({ patchUrl, accent }: Props) {
  const router = useRouter();
  const [logDate, setLogDate] = useState("");
  const [logAction, setLogAction] = useState("");
  const [logMemo, setLogMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const resetForm = useCallback(() => {
    setLogDate(toDatetimeLocalValue());
    setLogAction("");
    setLogMemo("");
  }, []);

  useEffect(() => {
    resetForm();
  }, [patchUrl, resetForm]);

  useEffect(() => {
    if (!feedback || feedback.type !== "ok") return;
    const t = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(t);
  }, [feedback]);

  async function submitAppend(e: React.FormEvent) {
    e.preventDefault();
    if (!logAction.trim()) {
      setFeedback({ type: "err", text: "アクション（種類）を入力するか、下のボタンから選んでください。" });
      return;
    }
    let iso: string;
    try {
      const d = new Date(logDate);
      if (Number.isNaN(d.getTime())) throw new Error("日時が不正です");
      iso = d.toISOString();
    } catch {
      setFeedback({ type: "err", text: "日時を確認してください。" });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appendAction: {
            date: iso,
            action: logAction.trim(),
            memo: logMemo.trim(),
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error ?? `追加に失敗しました (${res.status})` });
        return;
      }
      setFeedback({ type: "ok", text: "ログを追加しました。" });
      resetForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-lg border-2 border-dashed p-3 shadow-sm ring-1 ${accentRing[accent]}`}>
      <p className="text-sm font-semibold text-zinc-900">アクションログを追加</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
        日時は「今」にセット済みです。定型ボタンで種類を選び、必要ならメモを書いて「ログに追加」だけで反映されます（他の項目を保存しなくても追加できます）。
      </p>

      <form className="mt-3 space-y-3" onSubmit={submitAppend}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <label htmlFor="action-log-when" className="block text-xs font-medium text-zinc-600">
              日時
            </label>
            <input
              id="action-log-when"
              type="datetime-local"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
            />
          </div>
          <button
            type="button"
            onClick={() => setLogDate(toDatetimeLocalValue())}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            今の時刻
          </button>
        </div>

        <div>
          <span className="block text-xs font-medium text-zinc-600">アクション（ワンタップ）</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((label) => {
              const active = logAction.trim() === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setLogAction(label);
                    setFeedback(null);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? chipActive[accent] : chipIdle[accent]}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="action-log-action" className="block text-xs font-medium text-zinc-600">
            アクション名（自由入力でも可）
          </label>
          <input
            id="action-log-action"
            type="text"
            value={logAction}
            onChange={(e) => setLogAction(e.target.value)}
            placeholder="例: 見積もり送付、折り返し待ち…"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="action-log-memo" className="block text-xs font-medium text-zinc-600">
            メモ（任意）
          </label>
          <textarea
            id="action-log-memo"
            rows={3}
            value={logMemo}
            onChange={(e) => setLogMemo(e.target.value)}
            placeholder="会話の要点、次のアクションなど"
            className="mt-1 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
        </div>

        {feedback ? (
          <p className={`text-xs font-medium ${feedback.type === "ok" ? "text-emerald-700" : "text-red-600"}`} role="status">
            {feedback.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy ? "追加中…" : "ログに追加"}
        </button>
      </form>
    </div>
  );
}
