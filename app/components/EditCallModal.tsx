"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Assignee = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
};

type CallType = {
  id: string;
  name: string;
  isActive: boolean;
};

type Call = {
  id: string;
  destination: string;
  memo: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string; color: string | null } | null;
  callTypeId?: string | null;
  isAppointment: boolean;
  createdAt: string;
  status?: "APPOINTMENT" | "NO_ANSWER" | "OTHER" | "SKIPPED";
};

type Props = {
  call: Call | null;
  onClose: () => void;
};

export function EditCallModal({ call, onClose }: Props) {
  const router = useRouter();
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [callTypes, setCallTypes] = useState<CallType[]>([]);
  const [destination, setDestination] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [callTypeId, setCallTypeId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [isAppointment, setIsAppointment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultStatus, setResultStatus] = useState<"APPOINTMENT" | "NO_ANSWER" | "OTHER" | "SKIPPED">("OTHER");

  useEffect(() => {
    if (!call) return;
    setDestination(call.destination);
    setAssigneeId(call.assigneeId ?? null);
    setCallTypeId(call.callTypeId ?? null);
    setMemo(call.memo ?? "");
    const d = new Date(call.createdAt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setDateInput(`${yyyy}-${mm}-${dd}`);
    setIsAppointment(call.isAppointment);
    setResultStatus(
      call.status === "APPOINTMENT" ||
        call.status === "NO_ANSWER" ||
        call.status === "OTHER" ||
        call.status === "SKIPPED"
        ? call.status
        : call.isAppointment
          ? "APPOINTMENT"
          : "OTHER"
    );
  }, [call]);

  useEffect(() => {
    fetch("/api/admin/assignees")
      .then((res) => res.json())
      .then((data) => setAssignees(Array.isArray(data) ? data : []));
    fetch("/api/admin/call-types")
      .then((res) => res.json())
      .then((data) => setCallTypes(Array.isArray(data) ? data : []));
  }, [call?.id]);

  useEffect(() => {
    if (!call) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [call, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!call) return;
    if (!destination.trim()) return;
    setSaving(true);
    try {
      const isAppointmentFlag = resultStatus === "APPOINTMENT" || isAppointment;
      const res = await fetch(`/api/calls/${call.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          assigneeId: assigneeId || null,
          callTypeId: callTypeId || null,
          memo: memo.trim() || null,
          isAppointment: isAppointmentFlag,
          status: resultStatus,
          createdAt: dateInput ? new Date(`${dateInput}T12:00:00`).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!call) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-zinc-900">架電を編集</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="edit-date" className="block text-sm font-medium text-zinc-700">
              日付
            </label>
            <input
              id="edit-date"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="edit-destination" className="block text-sm font-medium text-zinc-700">
              電話先（必須）
            </label>
            <input
              id="edit-destination"
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-zinc-700">担当者</span>
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
            </div>
          </div>
          <div>
            <label htmlFor="edit-call-type" className="block text-sm font-medium text-zinc-700">
              電話タイプ
            </label>
            <select
              id="edit-call-type"
              value={callTypeId ?? ""}
              onChange={(e) => setCallTypeId(e.target.value || null)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="">未設定</option>
              {callTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-zinc-700">結果</legend>
              <div className="flex flex-col gap-1.5 text-sm text-zinc-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="edit-call-result"
                    value="APPOINTMENT"
                    checked={resultStatus === "APPOINTMENT"}
                    onChange={() => {
                      setResultStatus("APPOINTMENT");
                      setIsAppointment(true);
                    }}
                    className="h-4 w-4 border-zinc-300 text-zinc-900"
                  />
                  <span>アポになった</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="edit-call-result"
                    value="NO_ANSWER"
                    checked={resultStatus === "NO_ANSWER"}
                    onChange={() => {
                      setResultStatus("NO_ANSWER");
                      setIsAppointment(false);
                    }}
                    className="h-4 w-4 border-zinc-300 text-zinc-900"
                  />
                  <span>未応答（電話に出なかった）</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="edit-call-result"
                    value="OTHER"
                    checked={resultStatus === "OTHER"}
                    onChange={() => {
                      setResultStatus("OTHER");
                      setIsAppointment(false);
                    }}
                    className="h-4 w-4 border-zinc-300 text-zinc-900"
                  />
                  <span>つながったがアポにならず</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="edit-call-result"
                    value="SKIPPED"
                    checked={resultStatus === "SKIPPED"}
                    onChange={() => {
                      setResultStatus("SKIPPED");
                      setIsAppointment(false);
                    }}
                    className="h-4 w-4 border-zinc-300 text-zinc-900"
                  />
                  <span>スキップ</span>
                </label>
              </div>
            </fieldset>
          </div>
          <div>
            <label htmlFor="edit-memo" className="block text-sm font-medium text-zinc-700">
              メモ
            </label>
            <textarea
              id="edit-memo"
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
