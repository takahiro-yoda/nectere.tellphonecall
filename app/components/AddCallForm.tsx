"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Assignee = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
};

type Props = {
  onAdded?: () => void;
};

export function AddCallForm({ onAdded }: Props) {
  const router = useRouter();
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [destination, setDestination] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [isAppointment, setIsAppointment] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  function setDefaultDate() {
    const now = new Date();
    setDateInput(
      now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0")
    );
  }

  useEffect(() => {
    if (open) setDefaultDate();
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
      if (isInput) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  useEffect(() => {
    fetch("/api/admin/assignees")
      .then((res) => res.json())
      .then((data) => setAssignees(Array.isArray(data) ? data : []));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!destination.trim()) return;
    setSubmitting(true);
    try {
      const createdAt = dateInput
        ? new Date(`${dateInput}T12:00:00`).toISOString()
        : undefined;
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          assigneeId: assigneeId || null,
          memo: memo.trim() || null,
          isAppointment,
          createdAt,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setDestination("");
      setAssigneeId(null);
      setMemo("");
      setIsAppointment(false);
      setDefaultDate();
      onAdded?.();
      router.refresh();
      setOpen(false);
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
        title="N キーでも開く"
      >
        架電を記録
        <span className="ml-1.5 text-zinc-400 font-normal">(N)</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">架電を記録</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="call-date" className="block text-sm font-medium text-zinc-700">
                  日付
                </label>
                <input
                  id="call-date"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="call-destination" className="block text-sm font-medium text-zinc-700">
                  電話先（必須）
                </label>
                <input
                  id="call-destination"
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="会社名・担当者名など"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-zinc-700">担当者（タグで選択）</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {assignees.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAssigneeId((id) => (id === a.id ? null : a.id))}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                        assigneeId === a.id ? "ring-2 ring-offset-1 ring-zinc-400" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: a.color ? `${a.color}20` : "#e4e4e720",
                        color: a.color || "#52525b",
                      }}
                    >
                      {a.name}
                    </button>
                  ))}
                  {assignees.length === 0 && (
                    <span className="text-xs text-zinc-400">
                      管理ダッシュボードで担当者を追加すると選べます
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="call-appo"
                  type="checkbox"
                  checked={isAppointment}
                  onChange={(e) => setIsAppointment(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                />
                <label htmlFor="call-appo" className="text-sm font-medium text-zinc-700">
                  アポになった
                </label>
              </div>
              <div>
                <label htmlFor="call-memo" className="block text-sm font-medium text-zinc-700">
                  メモ（任意）
                </label>
                <textarea
                  id="call-memo"
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="メモ"
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
