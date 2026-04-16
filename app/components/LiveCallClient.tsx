"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HamburgerMenu } from "./HamburgerMenu";
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

type CallStatus = "APPOINTMENT" | "NO_ANSWER" | "OTHER";
type Assignee = { id: string; name: string };

export function LiveCallClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scriptNodes, setScriptNodes] = useState<ScriptNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<CallStatus>("OTHER");
  const [memo, setMemo] = useState(searchParams.get("memo") ?? "");
  const [nodePath, setNodePath] = useState<string[]>([]);
  const [flowSteps, setFlowSteps] = useState<ScriptFlowStep[]>([]);
  const [assigneeName, setAssigneeName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = searchParams.get("destination") ?? "";
  const destinationContactName = searchParams.get("destinationContactName") ?? "";
  const destinationContactKana = searchParams.get("destinationContactKana") ?? "";
  const destinationPhone = searchParams.get("destinationPhone") ?? "";
  const callTypeId = searchParams.get("callTypeId") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const date = searchParams.get("date") ?? "";
  const time = searchParams.get("time") ?? "";

  useEffect(() => {
    if (!callTypeId) return;
    fetch(`/api/admin/call-scripts/${callTypeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const nodes = Array.isArray(data?.scriptNodes) ? (data.scriptNodes as ScriptNode[]) : [];
        setScriptNodes(nodes);
        const entryNode = nodes.find((n) => n.isEntry) ?? nodes[0] ?? null;
        setCurrentNodeId(entryNode?.id ?? null);
        setNodePath(entryNode?.id ? [entryNode.id] : []);
        setFlowSteps([]);
      })
      .catch(() => setScriptNodes([]));
  }, [callTypeId]);

  useEffect(() => {
    if (!assigneeId) {
      setAssigneeName("");
      return;
    }
    fetch("/api/admin/assignees")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? (data as Assignee[]) : [];
        const selected = list.find((a) => a.id === assigneeId);
        setAssigneeName(selected?.name?.trim() ?? "");
      })
      .catch(() => setAssigneeName(""));
  }, [assigneeId]);

  const currentNode = useMemo(
    () => scriptNodes.find((node) => node.id === currentNodeId) ?? null,
    [scriptNodes, currentNodeId]
  );
  const currentChoices = currentNode?.edgesFrom ?? [];
  const yesChoice = currentChoices.find((edge) => edge.choiceKey.toUpperCase() === "YES");
  const noChoice = currentChoices.find((edge) => edge.choiceKey.toUpperCase() === "NO");
  const yesNextNode = yesChoice?.toNodeId ? scriptNodes.find((node) => node.id === yesChoice.toNodeId) ?? null : null;
  const noNextNode = noChoice?.toNodeId ? scriptNodes.find((node) => node.id === noChoice.toNodeId) ?? null : null;

  const replaceScriptTokens = (rawText: string | null | undefined): string => {
    const text = rawText ?? "";
    const safeDestination = destination.trim();
    const safeAssigneeName = assigneeName || "担当者名";
    const safeDestinationContactName = destinationContactName.trim() || safeAssigneeName;
    return text
      .replaceAll("（自分の氏名）", safeAssigneeName)
      .replaceAll("(自分の氏名)", safeAssigneeName)
      .replaceAll("（発信先）", safeDestination)
      .replaceAll("(発信先)", safeDestination)
      .replaceAll("（発信先担当者名）", safeDestinationContactName)
      .replaceAll("(発信先担当者名)", safeDestinationContactName);
  };

  useEffect(() => {
    function onLiveKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (isInput) return;

      if (e.key === "y" || e.key === "Y") {
        const choice = currentChoices.find((edge) => edge.choiceKey.toUpperCase() === "YES");
        if (choice) {
          e.preventDefault();
          moveByChoice(choice);
        }
      }
      if (e.key === "n" || e.key === "N") {
        const choice = currentChoices.find((edge) => edge.choiceKey.toUpperCase() === "NO");
        if (choice) {
          e.preventDefault();
          moveByChoice(choice);
        }
      }
    }
    window.addEventListener("keydown", onLiveKeyDown);
    return () => window.removeEventListener("keydown", onLiveKeyDown);
  }, [currentChoices, resultStatus]);

  async function saveCall(status: CallStatus, flowOverride?: ScriptFlowData | null) {
    if (!destination.trim() || !callTypeId) {
      setError("初期情報が不足しています。記録開始からやり直してください。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const createdAt = date ? new Date(`${date}T${time || "12:00"}:00`).toISOString() : undefined;
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
          scriptFlow: flowOverride ?? buildScriptFlow(),
        }),
      });
      if (!res.ok) {
        setError(`記録に失敗しました (status: ${res.status})`);
        return;
      }
      router.push("/calls");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function moveByChoice(choice: ScriptEdge) {
    const newStep: ScriptFlowStep = {
      edgeId: choice.id,
      fromNodeId: currentNodeId || "",
      toNodeId: choice.toNodeId ?? null,
      choiceKey: choice.choiceKey,
      choiceLabel: choice.choiceLabel,
      at: new Date().toISOString(),
    };
    if (choice.toNodeId) {
      setFlowSteps((prev) => [...prev, newStep]);
      setNodePath((prev) => [...prev, choice.toNodeId!]);
      setCurrentNodeId(choice.toNodeId);
      return;
    }
    const nextFlow: ScriptFlowData | null =
      callTypeId && nodePath.length > 0
        ? {
            version: 1,
            callTypeId,
            nodePath,
            steps: [...flowSteps, newStep],
          }
        : null;
    setFlowSteps((prev) => [...prev, newStep]);
    void saveCall(resultStatus, nextFlow);
  }

  function buildScriptFlow(): ScriptFlowData | null {
    if (!callTypeId || nodePath.length === 0) return null;
    return {
      version: 1,
      callTypeId,
      nodePath,
      steps: flowSteps,
    };
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">通話中記録</h1>
              <p className="text-xs font-medium text-zinc-400">リアルタイムで結果を記録</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr,320px]">
        <section className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium tracking-wide text-zinc-500">電話先</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">{destination || "未設定"}</div>
            {(destinationContactName || destinationPhone) && (
              <div className="mt-2 space-y-0.5 text-xs text-zinc-600">
                {destinationContactName && <div>担当者名: {destinationContactName}</div>}
                {destinationContactKana && <div>ふりがな: {destinationContactKana}</div>}
                {destinationPhone && <div>電話番号: {destinationPhone}</div>}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-xl border-2 border-zinc-400 bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold tracking-[0.12em] text-zinc-900">CALL SCRIPT</div>
            <span className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs font-bold text-white">LIVE</span>
          </div>
          {currentNode ? (
            <>
              <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-3.5">
                <div className="text-xs font-medium text-zinc-500">現在のステップ</div>
                <div className="mt-1 text-lg font-bold text-zinc-900">{currentNode.title}</div>
                <p className="mt-2 whitespace-pre-wrap rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base leading-relaxed text-zinc-800">
                  {replaceScriptTokens(currentNode.body) || "（本文なし）"}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-3.5">
                <div className="mb-2 text-xs font-medium text-zinc-500">分岐選択（Y/Nキー対応）</div>
                {currentChoices.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {currentChoices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => moveByChoice(choice)}
                        className="group rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-100"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="leading-tight">
                            <div className="text-sm font-bold text-zinc-900">
                              {choice.choiceLabel || choice.choiceKey}
                            </div>
                            <div className="mt-1 text-xs font-medium text-zinc-600">
                              {choice.choiceKey} {choice.choiceLabel ? `キー` : ""}
                            </div>
                          </div>
                          <span className="rounded-full border border-zinc-500 bg-zinc-900 px-2.5 py-1 text-xs font-bold text-white group-hover:bg-zinc-700">
                            {choice.choiceKey}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">このステップに分岐はありません</div>
                )}
              </div>
              <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-3.5">
                <div className="mb-2 text-xs font-medium text-zinc-500">次ステップの見通し</div>
                <div className="grid grid-cols-1 gap-2 text-xs text-zinc-700 sm:grid-cols-2">
                  <div className="rounded-md border border-zinc-300 bg-white p-2.5">
                    <div className="font-semibold text-zinc-700">Y (YES) の次</div>
                    <div className="mt-1 text-base font-semibold text-zinc-900">
                      {yesNextNode?.title ?? "終了 / 未設定"}
                    </div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-600">
                      {yesNextNode?.body?.trim()
                        ? replaceScriptTokens(yesNextNode.body)
                        : yesNextNode
                          ? "（スクリプト本文なし）"
                          : "（次ステップなし）"}
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-300 bg-white p-2.5">
                    <div className="font-semibold text-zinc-700">N (NO) の次</div>
                    <div className="mt-1 text-base font-semibold text-zinc-900">
                      {noNextNode?.title ?? "終了 / 未設定"}
                    </div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-600">
                      {noNextNode?.body?.trim()
                        ? replaceScriptTokens(noNextNode.body)
                        : noNextNode
                          ? "（スクリプト本文なし）"
                          : "（次ステップなし）"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
              この通話タイプにはスクリプトが未設定です。管理画面で設定できます。
            </p>
          )}
          </div>
        </section>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">クイック情報</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">ショートカット</dt>
                <dd className="font-medium text-zinc-800">Y / N</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">現在ステップ</dt>
                <dd className="max-w-[180px] truncate font-medium text-zinc-800">{currentNode?.title || "未設定"}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-700">最終結果</legend>
            <div className="flex flex-col gap-1.5 text-sm text-zinc-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="call-result-live"
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
                  name="call-result-live"
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
                  name="call-result-live"
                  value="OTHER"
                  checked={resultStatus === "OTHER"}
                  onChange={() => setResultStatus("OTHER")}
                  className="h-4 w-4 border-zinc-300 text-zinc-900"
                />
                <span>通話のみ</span>
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor="live-call-memo" className="block text-sm font-medium text-zinc-700">
              メモ
            </label>
            <textarea
              id="live-call-memo"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
              placeholder="通話中メモ"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Link
              href="/calls"
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              中止して戻る
            </Link>
            <button
              type="button"
              onClick={() => void saveCall(resultStatus)}
              disabled={submitting}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "記録中…" : "通話結果を記録"}
            </button>
          </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
