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

type CallType = {
  id: string;
  name: string;
  isActive: boolean;
};
type CallStatus = "APPOINTMENT" | "NO_ANSWER" | "OTHER" | "SKIPPED";

export function AddCallForm({ onAdded }: Props) {
  const router = useRouter();
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [callTypes, setCallTypes] = useState<CallType[]>([]);
  const [callTypeId, setCallTypeId] = useState("");
  const [destination, setDestination] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [destinationContactName, setDestinationContactName] = useState("");
  const [destinationContactKana, setDestinationContactKana] = useState("");
  const [destinationPhone, setDestinationPhone] = useState("");
  const [contactKanaTouched, setContactKanaTouched] = useState(false);
  const [kanaLoading, setKanaLoading] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
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
        String(now.getDate()).padStart(2, "0")
    );
    setTimeInput(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  }

  useEffect(() => {
    if (open) setDefaultDate();
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      if (open) return;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
      if (isInput) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  useEffect(() => {
    fetch("/api/admin/assignees")
      .then((res) => res.json())
      .then((data) => setAssignees(Array.isArray(data) ? data : []));
    fetch("/api/admin/call-types")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? (data as CallType[]).filter((x) => x.isActive) : [];
        setCallTypes(list);
        setCallTypeId((prev) => prev || list[0]?.id || "");
      });
  }, [open]);

  function resetFormState() {
    setDestination("");
    setDestinationContactName("");
    setDestinationContactKana("");
    setDestinationPhone("");
    setContactKanaTouched(false);
    setAssigneeId(null);
    setMemo("");
  }

  function toHiragana(value: string): string {
    return value.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  function sanitizePhoneInput(value: string): string {
    return value.replace(/\D/g, "");
  }

  useEffect(() => {
    if (contactKanaTouched && destinationContactKana.trim() !== "") return;
    const source = destinationContactName.trim();
    if (source === "") {
      setDestinationContactKana("");
      setKanaLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setKanaLoading(true);
      try {
        const res = await fetch(`/api/furigana?text=${encodeURIComponent(source)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { hiragana?: string };
        const predicted = (data.hiragana ?? "").trim();
        setDestinationContactKana(predicted !== "" ? predicted : toHiragana(source).replace(/\s+/g, ""));
      } catch {
        setDestinationContactKana(toHiragana(source).replace(/\s+/g, ""));
      } finally {
        setKanaLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [destinationContactName, contactKanaTouched, destinationContactKana]);

  async function saveCall(status: CallStatus) {
    if (!destination.trim()) return;
    if (!callTypeId) {
      setError("通話タイプを選択してください");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const createdAt = dateInput
        ? new Date(`${dateInput}T${timeInput || "12:00"}:00`).toISOString()
        : undefined;
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          destinationContactName: destinationContactName.trim() || null,
          destinationContactKana: destinationContactKana.trim() || null,
          destinationPhone: destinationPhone.trim() || null,
          assigneeId: assigneeId || null,
          callTypeId,
          memo: memo.trim() || null,
          isAppointment: status === "APPOINTMENT",
          status,
          createdAt,
        }),
      });
      if (!res.ok) {
        let message = `登録に失敗しました (status: ${res.status})`;
        try {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            if (data) {
              const parts: string[] = [];
              if (typeof data.error === "string" && data.error.trim() !== "") {
                parts.push(data.error.trim());
              }
              if (typeof data.detail === "string" && data.detail.trim() !== "") {
                parts.push(`detail: ${data.detail.trim()}`);
              }
              if (parts.length > 0) {
                message = parts.join(" / ");
              }
            }
          } else {
            const text = await res.text();
            if (text.trim() !== "") {
              message = text;
            }
          }
        } catch {
          // ignore parse error and keep default message
        }
        setError(message);
        return;
      }
      resetFormState();
      setDefaultDate();
      onAdded?.();
      router.refresh();
      setOpen(false);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    await saveCall("SKIPPED");
  }

  function startCall() {
    if (!destination.trim()) {
      setError("電話先を入力してください");
      return;
    }
    if (!callTypeId) {
      setError("通話タイプを選択してください");
      return;
    }
    const params = new URLSearchParams({
      destination: destination.trim(),
      callTypeId,
      date: dateInput,
      time: timeInput,
    });
    if (assigneeId) params.set("assigneeId", assigneeId);
    if (destinationContactName.trim()) params.set("destinationContactName", destinationContactName.trim());
    if (destinationContactKana.trim()) params.set("destinationContactKana", destinationContactKana.trim());
    if (destinationPhone.trim()) params.set("destinationPhone", destinationPhone.trim());
    if (memo.trim()) params.set("memo", memo.trim());
    router.push(`/calls/live?${params.toString()}`);
    setOpen(false);
    resetFormState();
    setError(null);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) {
              setError(null);
            }
            return next;
          });
        }}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
        title="N キーでも開く"
      >
        記録開始
        <span className="ml-1.5 text-zinc-400 font-normal">(N)</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">架電の記録開始</h3>
            <div className="mt-2 text-xs text-zinc-500">
              電話先と通話タイプを決めると、通話中記録の専用ページへ移動します
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startCall();
              }}
              className="mt-4 space-y-4"
            >
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
                <label htmlFor="call-time" className="block text-sm font-medium text-zinc-700">
                  時刻
                </label>
                <input
                  id="call-time"
                  type="time"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
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
                <label htmlFor="call-destination-contact-name" className="block text-sm font-medium text-zinc-700">
                  担当者名
                </label>
                <input
                  id="call-destination-contact-name"
                  type="text"
                  value={destinationContactName}
                  onChange={(e) => {
                    setDestinationContactName(e.target.value);
                  }}
                  placeholder="例: 山田 太郎"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label htmlFor="call-destination-contact-kana" className="block text-sm font-medium text-zinc-700">
                  ふりがな
                </label>
                <input
                  id="call-destination-contact-kana"
                  type="text"
                  value={destinationContactKana}
                  onChange={(e) => {
                    const nextKana = e.target.value;
                    setDestinationContactKana(nextKana);
                    setContactKanaTouched(nextKana.trim() !== "");
                  }}
                  placeholder="例: やまだたろう"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
                />
                {kanaLoading && (
                  <p className="mt-1 text-xs text-zinc-500">ふりがなを予測中…</p>
                )}
              </div>
              <div>
                <label htmlFor="call-destination-phone" className="block text-sm font-medium text-zinc-700">
                  電話番号（ハイフンなし）
                </label>
                <input
                  id="call-destination-phone"
                  type="tel"
                  value={destinationPhone}
                  onChange={(e) => setDestinationPhone(sanitizePhoneInput(e.target.value))}
                  placeholder="例: 0312345678"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label htmlFor="call-type" className="block text-sm font-medium text-zinc-700">
                  電話タイプ（必須）
                </label>
                <select
                  id="call-type"
                  value={callTypeId}
                  onChange={(e) => setCallTypeId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                >
                  <option value="">選択してください</option>
                  {callTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
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
                  onClick={() => {
                    setOpen(false);
                    resetFormState();
                  }}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting || !destination.trim() || !callTypeId}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {submitting ? "記録中…" : "スキップ"}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !destination.trim() || !callTypeId}
                  className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  通話開始
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
