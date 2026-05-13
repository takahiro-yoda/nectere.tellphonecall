"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignMissingActionLogIdsClient,
  parseCustomerActionLogs,
  type CustomerActionLogEntry,
} from "@/lib/customers";

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

function toDatetimeLocalValue(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

type Props = {
  actionLogsRaw: unknown;
  patchUrl: string;
};

export function ActionLogHistorySection({ actionLogsRaw, patchUrl }: Props) {
  const router = useRouter();
  const logsChronological = useMemo(() => parseCustomerActionLogs(actionLogsRaw), [actionLogsRaw]);
  const reversed = useMemo(() => [...logsChronological].reverse(), [logsChronological]);
  const logsKey = useMemo(() => JSON.stringify(actionLogsRaw ?? null), [actionLogsRaw]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAction, setEditAction] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const needsIds = logsChronological.some((l) => !l.id?.trim());
    if (!needsIds) return;
    let cancelled = false;
    (async () => {
      const next = assignMissingActionLogIdsClient(logsChronological);
      try {
        const res = await fetch(patchUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replaceActionLogs: next }),
        });
        if (!cancelled && res.ok) router.refresh();
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patchUrl, logsKey, router, logsChronological]);

  function startEdit(log: CustomerActionLogEntry) {
    const id = log.id?.trim();
    if (!id) return;
    setEditingId(id);
    setEditDate(toDatetimeLocalValue(log.date));
    setEditAction(log.action);
    setEditMemo(log.memo);
    setError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setBusy(true);
    setError(null);
    try {
      const d = new Date(editDate);
      if (Number.isNaN(d.getTime())) {
        setError("日時が不正です");
        return;
      }
      const res = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateActionLog: {
            id: editingId,
            date: d.toISOString(),
            action: editAction.trim(),
            memo: editMemo,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `保存に失敗しました (${res.status})`);
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteLog(id: string) {
    if (!confirm("このアクションログを削除しますか？")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteActionLogId: id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `削除に失敗しました (${res.status})`);
        return;
      }
      if (editingId === id) setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-800">アクションログ</h2>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {reversed.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">まだ記録がありません。</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {reversed.map((log, idx) => {
            const id = log.id?.trim();
            const isEditing = id && editingId === id;
            return (
              <li
                key={id ?? `${log.date}-${idx}`}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600">日時</label>
                      <input
                        type="datetime-local"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600">アクション</label>
                      <input
                        value={editAction}
                        onChange={(e) => setEditAction(e.target.value)}
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600">メモ</label>
                      <textarea
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveEdit()}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-1 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-zinc-900">{log.action}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{formatDt(log.date)}</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{log.memo}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {id ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startEdit(log)}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void deleteLog(id)}
                            className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            削除
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
