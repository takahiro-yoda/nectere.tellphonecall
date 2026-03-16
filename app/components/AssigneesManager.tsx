"use client";

import { useState, useEffect } from "react";

type Assignee = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
};

export function AssigneesManager() {
  const [list, setList] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  async function fetchList() {
    const res = await fetch("/api/admin/assignees");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchList().finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/assignees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewName("");
      setNewColor("");
      await fetchList();
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: string) {
    const assignee = list.find((a) => a.id === id);
    if (!assignee) return;
    try {
      const res = await fetch(`/api/admin/assignees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() || assignee.name,
          color: editColor.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditingId(null);
      await fetchList();
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この担当者を削除しますか？紐づく架電の担当は未設定になります。")) return;
    try {
      const res = await fetch(`/api/admin/assignees/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await fetchList();
    } catch {
      // ignore
    }
  }

  function startEdit(a: Assignee) {
    setEditingId(a.id);
    setEditName(a.name);
    setEditColor(a.color ?? "");
  }

  if (loading) {
    return <p className="text-zinc-500">読み込み中…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">担当者（タグ）</h2>
        <p className="mt-1 text-sm text-zinc-500">
          架電記録で選択できる担当者を管理します。追加した担当者はタグのように選べます。
        </p>
        <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="assignee-name" className="block text-xs font-medium text-zinc-500">
              名前
            </label>
            <input
              id="assignee-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="山田"
              className="mt-1 rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="assignee-color" className="block text-xs font-medium text-zinc-500">
              色（任意）
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="assignee-color"
                type="color"
                value={newColor || "#3b82f6"}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-zinc-300 p-0"
              />
              <input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="#3b82f6"
                className="w-24 rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-900"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {adding ? "追加中…" : "追加"}
          </button>
        </form>

        <ul className="mt-6 flex flex-wrap gap-2">
          {list.map((a) => (
            <li key={a.id} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 pl-1 pr-1">
              <span
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: a.color || "#94a3b8" }}
                aria-hidden
              />
              {editingId === a.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-24 rounded px-2 py-0.5 text-sm text-zinc-900"
                    autoFocus
                  />
                  <input
                    type="color"
                    value={editColor || "#3b82f6"}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(a.id)}
                    className="rounded px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200"
                  >
                    キャンセル
                  </button>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 text-sm font-medium text-zinc-800">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                    title="編集"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="rounded p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    title="削除"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {list.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500">担当者がいません。上で追加してください。</p>
        )}
      </section>
    </div>
  );
}
