"use client";

import { useState } from "react";
import { normalizeOneUrl } from "@/lib/extraUrls";

type Props = {
  urls: string[];
  onChange: (next: string[]) => void;
  accent: "violet" | "rose";
};

const addBtn: Record<Props["accent"], string> = {
  violet: "bg-violet-600 hover:bg-violet-500",
  rose: "bg-rose-600 hover:bg-rose-500",
};

export function RecordUrlsEditor({ urls, onChange, accent }: Props) {
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  function addUrl() {
    setHint(null);
    const normalized = normalizeOneUrl(draft);
    if (!normalized) {
      setHint("有効な http(s) URL を入力してください");
      return;
    }
    if (urls.includes(normalized)) {
      setHint("既に追加済みです");
      return;
    }
    onChange([...urls, normalized]);
    setDraft("");
  }

  function removeAt(i: number) {
    onChange(urls.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">会社サイト、SNS、資料URLなど（「保存」でまとめて反映）</p>
      {urls.length > 0 ? (
        <ul className="space-y-1.5">
          {urls.map((u, i) => (
            <li
              key={`${u}-${i}`}
              className="flex items-start justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm"
            >
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 break-all text-sky-700 underline-offset-2 hover:underline"
              >
                {u}
              </a>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-400">リンクはまだありません</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          type="url"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="https://example.com"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        />
        <button
          type="button"
          onClick={addUrl}
          className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm ${addBtn[accent]}`}
        >
          追加
        </button>
      </div>
      {hint ? <p className="text-xs text-amber-700">{hint}</p> : null}
    </div>
  );
}
