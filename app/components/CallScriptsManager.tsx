"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CallType = {
  id: string;
  name: string;
  isActive: boolean;
};

type ScriptEdge = {
  id: string;
  choiceKey: string;
  choiceLabel: string | null;
  toNodeId: string | null;
  sortOrder: number;
};

type ScriptNode = {
  id: string;
  title: string;
  body: string;
  nodeType: "STEP" | "OUTCOME";
  isEntry: boolean;
  sortOrder: number;
  edgesFrom: ScriptEdge[];
};

type DraftNode = {
  id: string;
  title: string;
  body: string;
  nodeType: "STEP" | "OUTCOME";
  isEntry: boolean;
  sortOrder: number;
};

type DraftEdge = {
  id: string;
  fromNodeId: string;
  choiceKey: string;
  choiceLabel: string;
  toNodeId: string | null;
  sortOrder: number;
};

const PRESET_CHOICES = ["YES", "NO", "NO_ANSWER", "END"];

type Props = {
  fixedCallTypeId?: string;
  hideTypeSelector?: boolean;
};

export function CallScriptsManager({ fixedCallTypeId, hideTypeSelector = false }: Props) {
  const [types, setTypes] = useState<CallType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(fixedCallTypeId ?? "");
  const [nodes, setNodes] = useState<DraftNode[]>([]);
  const [edges, setEdges] = useState<DraftEdge[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [pendingAutoSave, setPendingAutoSave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingScript, setLoadingScript] = useState(false);
  const autoSaveInFlightRef = useRef(false);
  const autoSaveQueuedRef = useRef(false);

  async function fetchTypes() {
    const res = await fetch("/api/admin/call-types");
    const data = await res.json();
    const list = Array.isArray(data) ? (data as CallType[]) : [];
    setTypes(list);
    setSelectedTypeId((prev) => prev || fixedCallTypeId || list[0]?.id || "");
  }

  useEffect(() => {
    fetchTypes().finally(() => setLoadingTypes(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedCallTypeId]);

  async function fetchScript(callTypeId: string) {
    if (!callTypeId) {
      setNodes([]);
      setEdges([]);
      setError(null);
      return;
    }
    setLoadingScript(true);
    const res = await fetch(`/api/admin/call-scripts/${callTypeId}`);
    if (!res.ok) {
      let message = `スクリプト取得に失敗しました (status: ${res.status})`;
      try {
        const data = await res.json();
        if (typeof data?.error === "string" && data.error.trim()) {
          message = data.error.trim();
        }
      } catch {
        // ignore parse error
      }
      setError(message);
      setLoadingScript(false);
      return;
    }
    const data = await res.json();
    const scriptNodes = Array.isArray(data?.scriptNodes) ? (data.scriptNodes as ScriptNode[]) : [];
    const nextNodes: DraftNode[] = scriptNodes.map((n, i) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      nodeType: n.nodeType,
      isEntry: n.isEntry,
      sortOrder: typeof n.sortOrder === "number" ? n.sortOrder : i,
    }));
    const nextEdges: DraftEdge[] = scriptNodes
      .flatMap((n) => n.edgesFrom.map((e) => ({ ...e, fromNodeId: n.id })))
      .map((e, i) => ({
        id: e.id,
        fromNodeId: e.fromNodeId,
        choiceKey: e.choiceKey,
        choiceLabel: e.choiceLabel ?? "",
        toNodeId: e.toNodeId ?? null,
        sortOrder: typeof e.sortOrder === "number" ? e.sortOrder : i,
      }));
    setNodes(nextNodes);
    setEdges(nextEdges);
    setError(null);
    setLoadingScript(false);
  }

  useEffect(() => {
    fetchScript(selectedTypeId);
  }, [selectedTypeId]);

  const entryCount = useMemo(() => nodes.filter((n) => n.isEntry).length, [nodes]);

  function addNode() {
    const id = `new-node-${crypto.randomUUID()}`;
    setNodes((prev) => {
      const shifted = prev.map((node) => ({ ...node, sortOrder: node.sortOrder + 1 }));
      return [
        {
          id,
          title: `ステップ ${prev.length + 1}`,
          body: "",
          nodeType: "STEP",
          isEntry: prev.length === 0,
          sortOrder: 0,
        },
        ...shifted,
      ];
    });
    setPendingAutoSave(true);
  }

  function updateNode(id: string, patch: Partial<DraftNode>) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function removeNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.fromNodeId !== id && e.toNodeId !== id));
  }

  function addEdge(fromNodeId: string) {
    const id = `new-edge-${crypto.randomUUID()}`;
    setEdges((prev) => [
      ...prev,
      {
        id,
        fromNodeId,
        choiceKey: "YES",
        choiceLabel: "",
        toNodeId: null,
        sortOrder: prev.length,
      },
    ]);
  }

  function updateEdge(id: string, patch: Partial<DraftEdge>) {
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEdge(id: string) {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  }

  async function putScript(callTypeId: string, nextNodes: DraftNode[], nextEdges: DraftEdge[]) {
    const res = await fetch(`/api/admin/call-scripts/${callTypeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes: nextNodes, edges: nextEdges }),
    });
    if (!res.ok) {
      let message = `保存に失敗しました (status: ${res.status})`;
      try {
        const data = await res.json();
        if (typeof data?.error === "string" && data.error.trim()) {
          message = data.error.trim();
        }
      } catch {
        // ignore parse error
      }
      return { ok: false as const, message };
    }
    return { ok: true as const };
  }

  useEffect(() => {
    if (!pendingAutoSave) return;
    if (!selectedTypeId || loadingScript || saving) return;
    if (autoSaveInFlightRef.current) {
      autoSaveQueuedRef.current = true;
      return;
    }
    autoSaveInFlightRef.current = true;
    setAutoSaving(true);
    setPendingAutoSave(false);
    setError(null);
    const snapshotNodes = [...nodes];
    const snapshotEdges = [...edges];

    (async () => {
      try {
        const result = await putScript(selectedTypeId, snapshotNodes, snapshotEdges);
        if (!result.ok) {
          setError(result.message);
        }
      } finally {
        autoSaveInFlightRef.current = false;
        setAutoSaving(false);
        if (autoSaveQueuedRef.current) {
          autoSaveQueuedRef.current = false;
          setPendingAutoSave(true);
        }
      }
    })();
  }, [pendingAutoSave, selectedTypeId, loadingScript, saving, nodes, edges]);

  async function saveScript() {
    if (!selectedTypeId) return;
    if (loadingScript || autoSaving) return;
    if (nodes.length === 0) {
      const ok = confirm("ノードが0件のまま保存すると、この通話タイプのスクリプトは空になります。保存しますか？");
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await putScript(selectedTypeId, nodes, edges);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await fetchScript(selectedTypeId);
    } finally {
      setSaving(false);
    }
  }

  if (loadingTypes) return <p className="text-zinc-500">読み込み中…</p>;

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const orderedNodes = [...nodes].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">通話スクリプト分岐</h2>
      <p className="mt-1 text-sm text-zinc-500">
        通話タイプごとに、通話中のステップと分岐（YES/NOなど）を視覚的に管理できます。
      </p>
      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!hideTypeSelector && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-zinc-500">通話タイプ別フロー</div>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTypeId(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  selectedTypeId === t.id
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {t.name}
                {!t.isActive ? " (無効)" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-zinc-500">エントリーノード: {entryCount}件（推奨: 1件）</div>
        <button
          type="button"
          onClick={addNode}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          ノード追加
        </button>
      </div>

      {selectedTypeId && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr,1fr]">
          <div className="space-y-4">
            {orderedNodes.map((node, index) => (
              <div key={node.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-500">STEP {index + 1}</div>
                  <div className="flex items-center gap-2">
                    <select
                      value={node.nodeType}
                      onChange={(e) => updateNode(node.id, { nodeType: e.target.value as "STEP" | "OUTCOME" })}
                      className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
                    >
                      <option value="STEP">STEP</option>
                      <option value="OUTCOME">OUTCOME</option>
                    </select>
                    <label className="inline-flex items-center gap-1 text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        checked={node.isEntry}
                        onChange={(e) => updateNode(node.id, { isEntry: e.target.checked })}
                      />
                      開始点
                    </label>
                    <button
                      type="button"
                      onClick={() => removeNode(node.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={node.title}
                  onChange={(e) => updateNode(node.id, { title: e.target.value })}
                  className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-medium text-zinc-900"
                  placeholder="ノードタイトル"
                />
                <textarea
                  rows={2}
                  value={node.body}
                  onChange={(e) => updateNode(node.id, { body: e.target.value })}
                  className="mt-2 w-full rounded-md border border-zinc-300 px-2.5 py-2 text-sm text-zinc-900"
                  placeholder="通話中に表示するスクリプト"
                />
                <div className="mt-3 space-y-2 rounded-lg border border-zinc-200 bg-zinc-100 p-2">
                  <div className="text-xs font-semibold text-zinc-700">このステップの分岐</div>
                  {edges
                    .filter((edge) => edge.fromNodeId === node.id)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((edge) => {
                      const nextNode = edge.toNodeId ? nodesById.get(edge.toNodeId) : null;
                      return (
                        <div key={edge.id} className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-300 bg-white p-2">
                          <select
                            value={edge.choiceKey}
                            onChange={(e) => updateEdge(edge.id, { choiceKey: e.target.value })}
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-900"
                          >
                            {PRESET_CHOICES.map((key) => (
                              <option key={key} value={key}>
                                {key}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={edge.choiceLabel}
                            onChange={(e) => updateEdge(edge.id, { choiceLabel: e.target.value })}
                            placeholder="表示名（例: 応答）"
                            className="min-w-[140px] rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900"
                          />
                          <span className="text-xs font-semibold text-zinc-700">→</span>
                          <select
                            value={edge.toNodeId ?? ""}
                            onChange={(e) => updateEdge(edge.id, { toNodeId: e.target.value || null })}
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-900"
                          >
                            <option value="">終了</option>
                            {orderedNodes
                              .filter((n) => n.id !== node.id)
                              .map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.title}
                                </option>
                              ))}
                          </select>
                          <span className="text-xs font-semibold text-zinc-900">
                            {nextNode ? `次: ${nextNode.title}` : "次: 終了"}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEdge(edge.id)}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                          >
                            削除
                          </button>
                        </div>
                      );
                    })}
                  <button
                    type="button"
                    onClick={() => addEdge(node.id)}
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                  >
                    分岐追加
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-800">フロープレビュー</h3>
            <p className="mt-1 text-xs text-zinc-500">現在選択中の通話タイプのみ表示します。</p>
            <div className="mt-3 space-y-3">
              {orderedNodes.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-3 text-xs text-zinc-500">
                  ノードがありません。左側で「ノード追加」してください。
                </div>
              )}
              {orderedNodes.map((node) => (
                <div key={`preview-${node.id}`} className="rounded-lg border border-zinc-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-zinc-900">{node.title || "（無題）"}</div>
                    {node.isEntry && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        START
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{node.nodeType}</div>
                  <div className="mt-2 space-y-1">
                    {edges
                      .filter((edge) => edge.fromNodeId === node.id)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((edge) => (
                        <div key={`preview-edge-${edge.id}`} className="text-xs text-zinc-600">
                          {edge.choiceKey}
                          {edge.choiceLabel ? `（${edge.choiceLabel}）` : ""}
                          {" → "}
                          {edge.toNodeId ? nodesById.get(edge.toNodeId)?.title ?? "未設定" : "終了"}
                        </div>
                      ))}
                    {edges.filter((edge) => edge.fromNodeId === node.id).length === 0 && (
                      <div className="text-xs text-zinc-400">分岐なし</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={saveScript}
          disabled={!selectedTypeId || saving || autoSaving || loadingScript}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loadingScript ? "読み込み中…" : saving ? "保存中…" : autoSaving ? "自動保存中…" : "スクリプト保存"}
        </button>
      </div>
    </section>
  );
}
