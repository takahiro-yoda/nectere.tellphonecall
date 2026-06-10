"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type KpiOrderItem = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

type KpiOrderEditorProps = {
  onReorder?: () => void;
};

export function KpiOrderEditor({ onReorder }: KpiOrderEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<KpiOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kpi/definitions");
      const data = await res.json();
      const list: KpiOrderItem[] = (Array.isArray(data.items) ? data.items : [])
        .filter((k: KpiOrderItem) => k.isActive)
        .sort((a: KpiOrderItem, b: KpiOrderItem) => a.sortOrder - b.sortOrder);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchItems();
  }, [open, fetchItems]);

  async function saveOrder(ordered: KpiOrderItem[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/kpi/definitions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: ordered.map((i) => i.id) }),
      });
      if (!res.ok) throw new Error("Failed");
      setItems(ordered);
      onReorder?.();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    void saveOrder(next);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        表示順を調整
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">表示順の調整</p>
          <p className="mt-0.5 text-xs text-zinc-500">上にあるKPIほどダッシュボードの左・上に表示されます</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs text-zinc-500 hover:text-zinc-800"
        >
          閉じる
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">読み込み中…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">有効なKPIがありません。</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2"
            >
              <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-zinc-400">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                {item.name}
              </span>
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={saving || index === 0}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
                  aria-label={`${item.name}を上へ`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={saving || index === items.length - 1}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
                  aria-label={`${item.name}を下へ`}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {saving && <p className="mt-2 text-xs text-zinc-500">保存中…</p>}
    </div>
  );
}
