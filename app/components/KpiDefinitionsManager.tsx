"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { KpiDataSource } from "@prisma/client";
import { KPI_DATA_SOURCE_LABELS, KPI_TEMPLATES } from "@/lib/kpi";

const inputClass =
  "mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400";

type KpiUnit = {
  id: string;
  name: string;
  symbol: string;
};

type KpiDefinition = {
  id: string;
  name: string;
  dataSource: KpiDataSource;
  unitId: string;
  unit: KpiUnit;
  isActive: boolean;
  sortOrder: number;
  dataSourceLabel?: string;
};

type DropPlacement = "before" | "after";

type DropPosition = {
  index: number;
  placement: DropPlacement;
  lineTop: number;
};

const DROP_HYSTERESIS_PX = 10;

function computeInsertIndex(
  dragIndex: number,
  hoverIndex: number,
  placement: DropPlacement
): number {
  let insertAt = placement === "before" ? hoverIndex : hoverIndex + 1;
  if (dragIndex < insertAt) insertAt -= 1;
  return insertAt;
}

function getTargetRank(dragIndex: number, hoverIndex: number, placement: DropPlacement): number {
  return computeInsertIndex(dragIndex, hoverIndex, placement) + 1;
}

function DragHandle() {
  return (
    <span
      className="inline-flex cursor-grab flex-col gap-0.5 px-1 text-zinc-400 active:cursor-grabbing"
      aria-hidden
    >
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
    </span>
  );
}

export function KpiDefinitionsManager() {
  const router = useRouter();
  const [items, setItems] = useState<KpiDefinition[]>([]);
  const [units, setUnits] = useState<KpiUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const [newName, setNewName] = useState("");
  const [newUnitId, setNewUnitId] = useState("");
  const [newDataSource, setNewDataSource] = useState<KpiDataSource>("MANUAL");
  const [adding, setAdding] = useState(false);
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [defsRes, unitsRes] = await Promise.all([
      fetch("/api/kpi/definitions"),
      fetch("/api/kpi/units"),
    ]);
    const defsData = await defsRes.json();
    const unitsData = await unitsRes.json();
    const list: KpiDefinition[] = (Array.isArray(defsData.items) ? defsData.items : []).sort(
      (a: KpiDefinition, b: KpiDefinition) => a.sortOrder - b.sortOrder
    );
    setItems(list);
    const unitList = Array.isArray(unitsData.items) ? unitsData.items : [];
    setUnits(unitList);
    setNewUnitId((prev) => prev || (unitList[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  async function saveOrder(ordered: KpiDefinition[]) {
    setReordering(true);
    const prev = items;
    setItems(ordered);
    try {
      const res = await fetch("/api/kpi/definitions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: ordered.map((i) => i.id) }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      setItems(prev);
    } finally {
      setReordering(false);
    }
  }

  function reorderItems(fromIndex: number, insertAt: number) {
    if (fromIndex === insertAt || fromIndex < 0 || insertAt < 0) return;
    const next = [...items];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(insertAt, 0, removed);
    void saveOrder(next);
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
    setDropPosition(null);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const row = e.currentTarget as HTMLTableRowElement;
    const rect = row.getBoundingClientRect();
    const wrap = row.closest("[data-kpi-table-wrap]") as HTMLDivElement | null;
    if (!wrap) return;

    const mid = rect.top + rect.height / 2;
    const wrapRect = wrap.getBoundingClientRect();

    setDropPosition((prev) => {
      let placement: DropPlacement = e.clientY < mid ? "before" : "after";
      if (prev?.index === index) {
        if (prev.placement === "before" && e.clientY > mid + DROP_HYSTERESIS_PX) {
          placement = "after";
        } else if (prev.placement === "after" && e.clientY < mid - DROP_HYSTERESIS_PX) {
          placement = "before";
        } else {
          placement = prev.placement;
        }
      }

      const lineTop =
        (placement === "before" ? rect.top : rect.bottom) - wrapRect.top + wrap.scrollTop;

      if (
        prev?.index === index &&
        prev.placement === placement &&
        Math.abs(prev.lineTop - lineTop) < 0.5
      ) {
        return prev;
      }
      return { index, placement, lineTop };
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (dragIndex == null || dropPosition == null) return;
    const insertAt = computeInsertIndex(
      dragIndex,
      dropPosition.index,
      dropPosition.placement
    );
    reorderItems(dragIndex, insertAt);
    setDragIndex(null);
    setDropPosition(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropPosition(null);
  }

  const targetRank =
    dragIndex != null && dropPosition != null
      ? getTargetRank(dragIndex, dropPosition.index, dropPosition.placement)
      : null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newUnitId) return;
    setAdding(true);
    try {
      const res = await fetch("/api/kpi/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          unitId: newUnitId,
          dataSource: newDataSource,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewName("");
      await fetchAll();
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleAddTemplate(templateName: string) {
    const template = KPI_TEMPLATES.find((t) => t.name === templateName);
    if (!template) return;
    const unit = units.find((u) => u.symbol === template.unitSymbol);
    if (!unit) return;

    setAddingTemplate(templateName);
    try {
      const res = await fetch("/api/kpi/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          unitId: unit.id,
          dataSource: template.dataSource,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchAll();
      router.refresh();
    } finally {
      setAddingTemplate(null);
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/kpi/definitions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (!res.ok) return;
    await fetchAll();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("このKPIを削除しますか？期間データも削除されます。")) return;
    const res = await fetch(`/api/kpi/definitions/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    await fetchAll();
    router.refresh();
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-zinc-500">読み込み中…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">KPI定義</h2>
      <p className="mt-1 text-sm text-zinc-500">
        KPIの名称・単位・データソースを設定します。左端をドラッグしてダッシュボードの表示順を変更できます。
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {KPI_TEMPLATES.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => handleAddTemplate(t.name)}
            disabled={addingTemplate === t.name || units.length === 0}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
          >
            {addingTemplate === t.name ? "追加中…" : `+ ${t.name}`}
          </button>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[140px] flex-1">
          <label className="block text-xs font-medium text-zinc-600">KPI名</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例: 月間売上"
            className={`${inputClass} w-full`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">単位</label>
          <select
            value={newUnitId}
            onChange={(e) => setNewUnitId(e.target.value)}
            className={inputClass}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">データソース</label>
          <select
            value={newDataSource}
            onChange={(e) => setNewDataSource(e.target.value as KpiDataSource)}
            className={inputClass}
          >
            {(Object.keys(KPI_DATA_SOURCE_LABELS) as KpiDataSource[]).map((key) => (
              <option key={key} value={key}>
                {KPI_DATA_SOURCE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {adding ? "追加中…" : "追加"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">KPIがまだありません。</p>
      ) : (
        <div
          data-kpi-table-wrap
          className="relative mt-6 overflow-x-auto rounded-lg border border-zinc-200"
        >
          {dragIndex != null && targetRank != null && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 border-b border-blue-200 bg-blue-50/95 px-4 py-2.5 text-sm text-blue-900 backdrop-blur-sm">
              <span className="font-medium">「{items[dragIndex]?.name}」</span>
              <span className="text-blue-700"> を </span>
              <span className="inline-flex items-center rounded-md bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                {targetRank}番目
              </span>
              <span className="text-blue-700"> に移動</span>
            </div>
          )}
          {dropPosition != null && targetRank != null && (
            <div
              className="pointer-events-none absolute inset-x-3 z-10 flex -translate-y-1/2 items-center gap-2"
              style={{ top: dropPosition.lineTop }}
            >
              <div className="h-3 w-3 shrink-0 rounded-full border-2 border-blue-500 bg-white shadow-sm" />
              <div className="h-1 flex-1 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
              <span className="shrink-0 rounded-md bg-blue-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                {targetRank}番目
              </span>
              <div className="h-1 flex-1 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
            </div>
          )}
          {reordering && (
            <p className="border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
              順番を保存中…
            </p>
          )}
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="w-14 px-3 py-3 font-semibold text-zinc-700" />
                <th className="px-4 py-3 font-semibold text-zinc-700">名称</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">単位</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">ソース</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">状態</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDropPosition(null);
                }
              }}
            >
              {items.map((item, index) => {
                const isDragging = dragIndex === index;
                const isOtherDragging = dragIndex != null && !isDragging;

                return (
                  <tr
                    key={item.id}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    className={`border-b border-zinc-100 ${
                      !item.isActive ? "opacity-60" : ""
                    } ${isDragging ? "bg-blue-50/80 opacity-50" : ""} ${
                      isOtherDragging ? "opacity-80" : ""
                    }`}
                  >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <div
                            draggable={!reordering}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", String(index));
                              handleDragStart(index);
                            }}
                            onDragEnd={handleDragEnd}
                            className="touch-none select-none rounded p-0.5 hover:bg-zinc-100"
                            title="ドラッグして並び替え"
                          >
                            <DragHandle />
                          </div>
                          <span
                            className={`w-5 text-center text-xs font-bold tabular-nums ${
                              isDragging ? "text-blue-600" : "text-zinc-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{item.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{item.unit.symbol}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {item.dataSourceLabel ?? KPI_DATA_SOURCE_LABELS[item.dataSource]}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {item.isActive ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item.id, item.isActive)}
                            className="text-xs text-zinc-600 hover:text-zinc-900"
                          >
                            {item.isActive ? "無効化" : "有効化"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
