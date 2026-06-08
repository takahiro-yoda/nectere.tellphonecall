"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400";

type KpiUnit = {
  id: string;
  name: string;
  symbol: string;
  position: string;
  sortOrder: number;
};

export function KpiUnitsManager() {
  const router = useRouter();
  const [list, setList] = useState<KpiUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newPosition, setNewPosition] = useState<"suffix" | "prefix">("suffix");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSymbol, setEditSymbol] = useState("");
  const [editPosition, setEditPosition] = useState<"suffix" | "prefix">("suffix");

  async function fetchList() {
    const res = await fetch("/api/kpi/units");
    const data = await res.json();
    setList(Array.isArray(data.items) ? data.items : []);
  }

  useEffect(() => {
    fetchList().finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newSymbol.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/kpi/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          symbol: newSymbol.trim(),
          position: newPosition,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewName("");
      setNewSymbol("");
      await fetchList();
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  function startEdit(unit: KpiUnit) {
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditSymbol(unit.symbol);
    setEditPosition(unit.position === "prefix" ? "prefix" : "suffix");
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/kpi/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          symbol: editSymbol.trim(),
          position: editPosition,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditingId(null);
      await fetchList();
      router.refresh();
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この単位を削除しますか？")) return;
    try {
      const res = await fetch(`/api/kpi/units/${id}`, { method: "DELETE" });
      if (res.status === 409) {
        alert("この単位はKPIで使用中のため削除できません。");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      await fetchList();
      router.refresh();
    } catch {
      // ignore
    }
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
      <h2 className="text-lg font-semibold text-zinc-900">単位管理</h2>
      <p className="mt-1 text-sm text-zinc-500">%, 円, 件 などKPIの表示単位を追加・編集します。</p>

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600">表示名</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例: パーセント"
            className={`${inputClass} mt-1`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">記号</label>
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="例: %"
            className={`${inputClass} mt-1 w-20`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">位置</label>
          <select
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value as "suffix" | "prefix")}
            className={`${inputClass} mt-1`}
          >
            <option value="suffix">後ろ（100%）</option>
            <option value="prefix">前（$100）</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={adding || !newName.trim() || !newSymbol.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {adding ? "追加中…" : "追加"}
        </button>
      </form>

      <ul className="mt-6 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
        {list.map((unit) => (
          <li key={unit.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            {editingId === unit.id ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`${inputClass} px-2 py-1`}
                  />
                  <input
                    type="text"
                    value={editSymbol}
                    onChange={(e) => setEditSymbol(e.target.value)}
                    className={`${inputClass} w-16 px-2 py-1`}
                  />
                  <select
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value as "suffix" | "prefix")}
                    className={`${inputClass} px-2 py-1`}
                  >
                    <option value="suffix">後ろ</option>
                    <option value="prefix">前</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate(unit.id)}
                    className="text-sm text-zinc-900 hover:underline"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-sm text-zinc-500 hover:underline"
                  >
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="font-medium text-zinc-900">{unit.name}</span>
                  <span className="ml-2 text-zinc-500">
                    例: {unit.position === "prefix" ? `${unit.symbol}100` : `100${unit.symbol}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(unit)}
                    className="text-sm text-zinc-600 hover:text-zinc-900"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(unit.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
