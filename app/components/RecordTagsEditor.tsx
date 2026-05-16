"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidRecordTagName, normalizeRecordTagName } from "@/lib/recordTags";

export type RecordTagLite = { id: string; name: string; color: string | null };

type Props = {
  recordType: "lead" | "customer";
  recordId: string;
  initialTags: RecordTagLite[];
  /** ラベル上のクラス（詳細サマリー用） */
  labelClassName?: string;
};

const ACCENT = {
  lead: {
    chip: "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100",
    btn: "bg-rose-600 hover:bg-rose-500",
    ring: "focus:ring-rose-500",
  },
  customer: {
    chip: "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100",
    btn: "bg-violet-600 hover:bg-violet-500",
    ring: "focus:ring-violet-500",
  },
} as const;

export function RecordTagsEditor({
  recordType,
  recordId,
  initialTags,
  labelClassName = "block text-xs font-medium tracking-wide text-zinc-500",
}: Props) {
  const router = useRouter();
  const accent = ACCENT[recordType];
  const tagsApi = recordType === "lead" ? `/api/leads/${recordId}/tags` : `/api/customers/${recordId}/tags`;
  const catalogApi = recordType === "lead" ? "/api/lead-tags" : "/api/customer-tags";

  const [tags, setTags] = useState<RecordTagLite[]>(initialTags);
  const [catalog, setCatalog] = useState<RecordTagLite[]>([]);
  const [newName, setNewName] = useState("");
  const [pickId, setPickId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags, recordId]);

  useEffect(() => {
    let cancelled = false;
    fetch(catalogApi)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: RecordTagLite[] }) => {
        if (!cancelled) setCatalog(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogApi]);

  const attachedIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);
  const availableToAttach = useMemo(
    () => catalog.filter((t) => !attachedIds.has(t.id)),
    [catalog, attachedIds],
  );

  async function addTag(body: { tagId?: string; tagName?: string }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(tagsApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { tags?: RecordTagLite[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? `追加に失敗しました (${res.status})`);
        return;
      }
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
    setError(null);
    try {
      const res = await fetch(tagsApi, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      const data = (await res.json().catch(() => ({}))) as { tags?: RecordTagLite[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? `削除に失敗しました (${res.status})`);
        return;
      }
      if (Array.isArray(data.tags)) setTags(data.tags);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <label className={labelClassName} htmlFor={`${recordType}-tag-new-${recordId}`}>
        タグ
      </label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <span className="text-sm text-zinc-400">なし</span>
        ) : (
          tags.map((t) => (
            <span
              key={t.id}
              className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${accent.chip}`}
            >
              <span className="truncate">{t.name}</span>
              <button
                type="button"
                disabled={saving}
                onClick={() => void removeTag(t.id)}
                className="shrink-0 rounded-full px-0.5 leading-none opacity-70 hover:opacity-100 disabled:opacity-40"
                aria-label={`${t.name} を外す`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <span className="sr-only">新規タグ名</span>
          <input
            id={`${recordType}-tag-new-${recordId}`}
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const name = normalizeRecordTagName(newName);
                if (isValidRecordTagName(name)) void addTag({ tagName: name });
              }
            }}
            placeholder="新規タグ名"
            disabled={saving}
            className={`w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:opacity-60 ${accent.ring} focus:outline-none focus:ring-2`}
          />
        </div>
        <button
          type="button"
          disabled={saving || !isValidRecordTagName(normalizeRecordTagName(newName))}
          onClick={() => void addTag({ tagName: normalizeRecordTagName(newName) })}
          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${accent.btn}`}
        >
          追加
        </button>
      </div>
      {availableToAttach.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1">
            <label htmlFor={`${recordType}-tag-pick-${recordId}`} className="sr-only">
              既存タグ
            </label>
            <select
              id={`${recordType}-tag-pick-${recordId}`}
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              disabled={saving}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 disabled:opacity-60"
            >
              <option value="">既存タグを選ぶ…</option>
              {availableToAttach.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={saving || !pickId}
            onClick={() => void addTag({ tagId: pickId })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            付与
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
