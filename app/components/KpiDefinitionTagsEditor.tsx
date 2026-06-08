"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { KpiTagLite } from "@/lib/kpiTags";
import { isValidKpiTagName, normalizeKpiTagName } from "@/lib/kpiTags";

type Props = {
  definitionId: string;
  initialTags: KpiTagLite[];
};

export function KpiDefinitionTagsEditor({ definitionId, initialTags }: Props) {
  const router = useRouter();
  const tagsApi = `/api/kpi/definitions/${definitionId}/tags`;

  const [tags, setTags] = useState<KpiTagLite[]>(initialTags);
  const [catalog, setCatalog] = useState<KpiTagLite[]>([]);
  const [newName, setNewName] = useState("");
  const [pickId, setPickId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags, definitionId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kpi/tags")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: KpiTagLite[] }) => {
        if (!cancelled) setCatalog(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const attachedIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);
  const availableToAttach = useMemo(
    () => catalog.filter((t) => !attachedIds.has(t.id)),
    [catalog, attachedIds],
  );

  async function addTag(body: { tagId?: string; tagName?: string }) {
    setSaving(true);
    try {
      const res = await fetch(tagsApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { tags?: KpiTagLite[] };
      if (!res.ok) return;
      if (Array.isArray(data.tags)) setTags(data.tags);
      setNewName("");
      setPickId("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removeTag(tagId: string) {
    setSaving(true);
    try {
      const res = await fetch(tagsApi, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      const data = (await res.json().catch(() => ({}))) as { tags?: KpiTagLite[] };
      if (!res.ok) return;
      if (Array.isArray(data.tags)) setTags(data.tags);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-[160px]">
      <div className="flex flex-wrap gap-1">
        {tags.length === 0 ? (
          <span className="text-xs text-zinc-400">なし</span>
        ) : (
          tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900"
            >
              <span className="truncate">{t.name}</span>
              <button
                type="button"
                disabled={saving}
                onClick={() => void removeTag(t.id)}
                className="shrink-0 rounded-full px-0.5 leading-none opacity-60 hover:opacity-100 disabled:opacity-40"
                aria-label={`${t.name} を外す`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const name = normalizeKpiTagName(newName);
              if (isValidKpiTagName(name)) void addTag({ tagName: name });
            }
          }}
          placeholder="新規タグ"
          disabled={saving}
          className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 disabled:opacity-60"
        />
        <button
          type="button"
          disabled={saving || !isValidKpiTagName(normalizeKpiTagName(newName))}
          onClick={() => void addTag({ tagName: normalizeKpiTagName(newName) })}
          className="shrink-0 rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          追加
        </button>
      </div>
      {availableToAttach.length > 0 ? (
        <div className="mt-1 flex items-center gap-1">
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            disabled={saving}
            className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs text-zinc-900 disabled:opacity-60"
          >
            <option value="">既存タグ…</option>
            {availableToAttach.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving || !pickId}
            onClick={() => void addTag({ tagId: pickId })}
            className="shrink-0 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            付与
          </button>
        </div>
      ) : null}
    </div>
  );
}
