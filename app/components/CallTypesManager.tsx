"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CallType = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export function CallTypesManager() {
  const [list, setList] = useState<CallType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function fetchList() {
    const res = await fetch("/api/admin/call-types");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchList().finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/call-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isActive: true }),
      });
      if (!res.ok) throw new Error("Failed");
      setName("");
      await fetchList();
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(callType: CallType) {
    await fetch(`/api/admin/call-types/${callType.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !callType.isActive }),
    });
    await fetchList();
  }

  async function handleDelete(id: string) {
    if (!confirm("この通話タイプを削除しますか？")) return;
    await fetch(`/api/admin/call-types/${id}`, { method: "DELETE" });
    await fetchList();
  }

  if (loading) return <p className="text-zinc-500">読み込み中…</p>;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">通話タイプ管理</h2>
      <p className="mt-1 text-sm text-zinc-500">架電開始時に選択する通話タイプを追加・有効化します。</p>

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 新規見込み客"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {adding ? "追加中…" : "追加"}
        </button>
      </form>

      <ul className="mt-5 space-y-2">
        {list.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-900">{item.name}</span>
              {!item.isActive && (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">無効</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/call-scripts/${item.id}`}
                className="rounded-md border border-blue-200 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50"
              >
                スクリプト管理
              </Link>
              <button
                type="button"
                onClick={() => toggleActive(item)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                {item.isActive ? "無効化" : "有効化"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mt-3 text-sm text-zinc-500">通話タイプがありません。</p>}
    </section>
  );
}
