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
  dataSourceLabel?: string;
};

export function KpiDefinitionsManager() {
  const router = useRouter();
  const [items, setItems] = useState<KpiDefinition[]>([]);
  const [units, setUnits] = useState<KpiUnit[]>([]);
  const [loading, setLoading] = useState(true);
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
    setItems(Array.isArray(defsData.items) ? defsData.items : []);
    const unitList = Array.isArray(unitsData.items) ? unitsData.items : [];
    setUnits(unitList);
    setNewUnitId((prev) => prev || (unitList[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

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
      <p className="mt-1 text-sm text-zinc-500">KPIの名称・単位・データソース（自動集計 or 手入力）を設定します。</p>

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
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 font-semibold text-zinc-700">名称</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">単位</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">ソース</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">状態</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{item.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{item.unit.symbol}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {item.dataSourceLabel ?? KPI_DATA_SOURCE_LABELS[item.dataSource]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
