"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HamburgerMenu } from "@/app/components/HamburgerMenu";
import type { ScriptFlowData, ScriptFlowStep } from "@/lib/callFlow";

type ScriptEdge = {
  id: string;
  choiceKey: string;
  choiceLabel: string | null;
  toNodeId: string | null;
};

type ScriptNode = {
  id: string;
  title: string;
  body: string;
  isEntry: boolean;
  edgesFrom: ScriptEdge[];
};

type CallRecord = {
  id: string;
  callCode?: string | null;
  destination: string;
  destinationContactName?: string | null;
  destinationContactKana?: string | null;
  destinationPhone?: string | null;
  memo: string | null;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; color: string | null } | null;
  callTypeId: string | null;
  callType?: { id: string; name: string } | null;
  isAppointment?: boolean;
  createdAt: string;
  status?: "APPOINTMENT" | "NO_ANSWER" | "OTHER" | "SKIPPED";
  scriptFlow?: ScriptFlowData | null;
};

type Assignee = {
  id: string;
  name: string;
  color: string | null;
};

type CallType = {
  id: string;
  name: string;
  isActive: boolean;
};

export default function CallFlowPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const callId = params.id;

  const [call, setCall] = useState<CallRecord | null>(null);
  const [nodes, setNodes] = useState<ScriptNode[]>([]);
  const [memo, setMemo] = useState("");
  const [nodePath, setNodePath] = useState<string[]>([]);
  const [steps, setSteps] = useState<ScriptFlowStep[]>([]);
  const [destination, setDestination] = useState("");
  const [destinationContactName, setDestinationContactName] = useState("");
  const [destinationContactKana, setDestinationContactKana] = useState("");
  const [destinationPhone, setDestinationPhone] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [callTypeId, setCallTypeId] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [resultStatus, setResultStatus] = useState<"APPOINTMENT" | "NO_ANSWER" | "OTHER" | "SKIPPED">("OTHER");
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [callTypes, setCallTypes] = useState<CallType[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const callRes = await fetch(`/api/calls/${callId}`);
        if (!callRes.ok) throw new Error("架電データの取得に失敗しました");
        const callData = (await callRes.json()) as CallRecord;
        setCall(callData);
        setMemo(callData.memo ?? "");
        setDestination(callData.destination ?? "");
        setDestinationContactName(callData.destinationContactName ?? "");
        setDestinationContactKana(callData.destinationContactKana ?? "");
        setDestinationPhone(callData.destinationPhone ?? "");
        setAssigneeId(callData.assigneeId ?? null);
        setCallTypeId(callData.callTypeId ?? null);
        setNodePath(callData.scriptFlow?.nodePath ?? []);
        setSteps(callData.scriptFlow?.steps ?? []);
        const created = new Date(callData.createdAt);
        setDateInput(
          `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`
        );
        setTimeInput(`${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`);
        setResultStatus(
          callData.status === "APPOINTMENT" ||
            callData.status === "NO_ANSWER" ||
            callData.status === "OTHER" ||
            callData.status === "SKIPPED"
            ? callData.status
            : callData.isAppointment
              ? "APPOINTMENT"
              : "OTHER"
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みエラー");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [callId]);

  useEffect(() => {
    if (!callTypeId) {
      setNodes([]);
      setNodePath([]);
      setSteps([]);
      return;
    }
    fetch(`/api/admin/call-scripts/${callTypeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((scriptData) => {
        const scriptNodes = Array.isArray(scriptData?.scriptNodes) ? (scriptData.scriptNodes as ScriptNode[]) : [];
        setNodes(scriptNodes);
        if (scriptNodes.length === 0) {
          setNodePath([]);
          return;
        }
        setNodePath((prev) => {
          const filtered = prev.filter((nodeId) => scriptNodes.some((node) => node.id === nodeId));
          if (filtered.length > 0) return filtered;
          const entryNode = scriptNodes.find((n) => n.isEntry) ?? scriptNodes[0] ?? null;
          return entryNode?.id ? [entryNode.id] : [];
        });
      })
      .catch(() => setNodes([]));
  }, [callTypeId]);

  useEffect(() => {
    fetch("/api/admin/assignees")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAssignees(Array.isArray(data) ? data : []))
      .catch(() => setAssignees([]));
    fetch("/api/admin/call-types")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCallTypes(Array.isArray(data) ? data : []))
      .catch(() => setCallTypes([]));
  }, []);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const currentNode = nodePath.length > 0 ? (nodeMap.get(nodePath[nodePath.length - 1]) ?? null) : null;

  function moveChoice(edge: ScriptEdge) {
    const lastNodeId = nodePath[nodePath.length - 1] ?? "";
    const step: ScriptFlowStep = {
      edgeId: edge.id,
      fromNodeId: lastNodeId,
      toNodeId: edge.toNodeId ?? null,
      choiceKey: edge.choiceKey,
      choiceLabel: edge.choiceLabel,
      at: new Date().toISOString(),
    };
    setSteps((prev) => [...prev, step]);
    if (edge.toNodeId) setNodePath((prev) => [...prev, edge.toNodeId!]);
  }

  function resetFlow() {
    const entryNode = nodes.find((n) => n.isEntry) ?? nodes[0] ?? null;
    setNodePath(entryNode?.id ? [entryNode.id] : []);
    setSteps([]);
  }

  async function saveCallDetails() {
    if (!call || !destination.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const scriptFlow: ScriptFlowData | null =
        (callTypeId ?? call.callTypeId) && nodePath.length > 0
          ? {
              version: 1,
              callTypeId: callTypeId ?? call.callTypeId ?? "",
              nodePath,
              steps,
            }
          : null;
      const res = await fetch(`/api/calls/${call.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          destinationContactName: destinationContactName.trim() || null,
          destinationContactKana: destinationContactKana.trim() || null,
          destinationPhone: destinationPhone.trim() || null,
          assigneeId: assigneeId || null,
          callTypeId: callTypeId || null,
          memo: memo.trim() || null,
          status: resultStatus,
          isAppointment: resultStatus === "APPOINTMENT",
          createdAt: dateInput ? new Date(`${dateInput}T${timeInput || "12:00"}:00`).toISOString() : undefined,
          scriptFlow,
        }),
      });
      if (!res.ok) throw new Error(`保存に失敗しました (status: ${res.status})`);
      const updated = (await res.json()) as CallRecord;
      setCall(updated);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存エラー");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-zinc-600">読み込み中…</div>;
  }

  if (!call) {
    return <div className="p-8 text-sm text-red-600">架電データが見つかりません。</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">通話詳細</h1>
              <p className="text-xs font-medium text-zinc-400">
                {call.destination}
                {call.callCode ? ` / ID: ${call.callCode}` : ""}
              </p>
            </div>
          </div>
          <Link
            href="/calls"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            一覧へ戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.1fr,360px]">
        <section className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">電話先</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{call.destination || "未設定"}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">通話タイプ</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{call.callType?.name ?? "未設定"}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">担当者名</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{call.destinationContactName || "未設定"}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">ふりがな</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{call.destinationContactKana || "未設定"}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">電話番号</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{call.destinationPhone || "未設定"}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">社内担当</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{call.assignee?.name ?? "未設定"}</div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">結果</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">
                  {call.status === "APPOINTMENT"
                    ? "アポ"
                    : call.status === "NO_ANSWER"
                      ? "未応答"
                      : call.status === "SKIPPED"
                        ? "スキップ"
                        : "通話のみ"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wide text-zinc-500">日時</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">
                  {new Date(call.createdAt).toLocaleString("ja-JP")}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-800">フローを編集</h2>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                最初から
              </button>
            </div>
            {!currentNode ? (
              <p className="text-sm text-zinc-500">この通話タイプにはスクリプトがありません。</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-500">現在ノード</div>
                  <div className="mt-1 text-base font-semibold text-zinc-900">{currentNode.title}</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{currentNode.body || "（本文なし）"}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(currentNode.edgesFrom ?? []).map((edge) => (
                    <button
                      key={edge.id}
                      type="button"
                      onClick={() => moveChoice(edge)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-50"
                    >
                      {edge.choiceLabel || edge.choiceKey}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">辿ったステップ</h2>
            {steps.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">まだ記録がありません。</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {steps.map((step, idx) => (
                  <li
                    key={`${step.edgeId}-${idx}`}
                    className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"
                  >
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-900 px-1 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-900">{step.choiceLabel || step.choiceKey}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {new Date(step.at).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">詳細情報を編集</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="flow-date" className="block text-sm font-medium text-zinc-700">
                  日付
                </label>
                <input
                  id="flow-date"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="flow-time" className="block text-sm font-medium text-zinc-700">
                  時刻
                </label>
                <input
                  id="flow-time"
                  type="time"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="flow-destination" className="block text-sm font-medium text-zinc-700">
                  電話先
                </label>
                <input
                  id="flow-destination"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="flow-contact-name" className="block text-sm font-medium text-zinc-700">
                  担当者名
                </label>
                <input
                  id="flow-contact-name"
                  type="text"
                  value={destinationContactName}
                  onChange={(e) => setDestinationContactName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="flow-contact-kana" className="block text-sm font-medium text-zinc-700">
                  ふりがな
                </label>
                <input
                  id="flow-contact-kana"
                  type="text"
                  value={destinationContactKana}
                  onChange={(e) => setDestinationContactKana(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="flow-phone" className="block text-sm font-medium text-zinc-700">
                  電話番号
                </label>
                <input
                  id="flow-phone"
                  type="tel"
                  value={destinationPhone}
                  onChange={(e) => setDestinationPhone(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="flow-call-type" className="block text-sm font-medium text-zinc-700">
                  電話タイプ
                </label>
                <select
                  id="flow-call-type"
                  value={callTypeId ?? ""}
                  onChange={(e) => setCallTypeId(e.target.value || null)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                >
                  <option value="">未設定</option>
                  {callTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-sm font-medium text-zinc-700">社内担当</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {assignees.map((assignee) => (
                    <button
                      key={assignee.id}
                      type="button"
                      onClick={() => setAssigneeId((current) => (current === assignee.id ? null : assignee.id))}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                        assigneeId === assignee.id ? "ring-2 ring-offset-1 ring-zinc-400" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: assignee.color ? `${assignee.color}20` : "#e4e4e720",
                        color: assignee.color || "#52525b",
                      }}
                    >
                      {assignee.name}
                    </button>
                  ))}
                </div>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-zinc-700">結果</legend>
                <div className="flex flex-col gap-1.5 text-sm text-zinc-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="flow-call-result"
                      value="APPOINTMENT"
                      checked={resultStatus === "APPOINTMENT"}
                      onChange={() => setResultStatus("APPOINTMENT")}
                      className="h-4 w-4 border-zinc-300 text-zinc-900"
                    />
                    <span>アポになった</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="flow-call-result"
                      value="NO_ANSWER"
                      checked={resultStatus === "NO_ANSWER"}
                      onChange={() => setResultStatus("NO_ANSWER")}
                      className="h-4 w-4 border-zinc-300 text-zinc-900"
                    />
                    <span>未応答</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="flow-call-result"
                      value="OTHER"
                      checked={resultStatus === "OTHER"}
                      onChange={() => setResultStatus("OTHER")}
                      className="h-4 w-4 border-zinc-300 text-zinc-900"
                    />
                    <span>通話のみ</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="flow-call-result"
                      value="SKIPPED"
                      checked={resultStatus === "SKIPPED"}
                      onChange={() => setResultStatus("SKIPPED")}
                      className="h-4 w-4 border-zinc-300 text-zinc-900"
                    />
                    <span>スキップ</span>
                  </label>
                </div>
              </fieldset>
              <div>
                <label htmlFor="flow-memo" className="block text-sm font-medium text-zinc-700">
                  メモ
                </label>
                <textarea
                  id="flow-memo"
                  rows={5}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => void saveCallDetails()}
              disabled={saving}
              className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? "保存中…" : "詳細とフローを保存"}
            </button>
          </section>
        </aside>
      </main>
    </div>
  );
}
