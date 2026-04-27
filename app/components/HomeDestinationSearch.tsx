"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SearchItem = {
  id: string;
  destination: string;
  destinationContactName: string | null;
  destinationContactKana: string | null;
  destinationPhone: string | null;
  callTypeId: string | null;
  createdAt: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export function HomeDestinationSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmedQuery });
        const res = await fetch(`/api/calls/search?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to search destinations");
        const data = (await res.json()) as { items?: SearchItem[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  return (
    <div className="mt-10">
      <label htmlFor="home-destination-search" className="sr-only">
        電話先を検索
      </label>
      <div className="relative">
        <input
          id="home-destination-search"
          name="q"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setTouched(true);
          }}
          placeholder="電話先名・担当者名・電話番号で検索"
          className="h-16 w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/70 px-5 pr-36 text-lg text-zinc-100 shadow-lg shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40"
        />
        <Link
          href={trimmedQuery ? `/calls/history?q=${encodeURIComponent(trimmedQuery)}` : "/calls/history"}
          className="absolute right-2 top-2 inline-flex h-12 items-center justify-center rounded-xl bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          詳細検索へ
        </Link>
      </div>

      {trimmedQuery && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg shadow-black/20">
          {loading ? (
            <div className="px-4 py-3 text-sm text-zinc-300">検索中...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-400">
              {trimmedQuery.length < 2
                ? "2文字以上で検索できます。"
                : touched
                  ? `「${trimmedQuery}」に一致する電話先はありません。`
                  : "検索語を入力してください。"}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-zinc-800/80">
                    <Link href={`/calls/${item.id}/flow`} className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-zinc-100">{item.destination}</div>
                      <div className="mt-0.5 truncate text-xs text-zinc-400">
                        {item.destinationContactName?.trim() || "担当者名未設定"}
                        {" / "}
                        {item.destinationPhone?.trim() || "電話番号未設定"}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/calls?prefillDestination=${encodeURIComponent(item.destination)}${
                          item.destinationContactName?.trim()
                            ? `&prefillContactName=${encodeURIComponent(item.destinationContactName.trim())}`
                            : ""
                        }${
                          item.destinationContactKana?.trim()
                            ? `&prefillContactKana=${encodeURIComponent(item.destinationContactKana.trim())}`
                            : ""
                        }${
                          item.destinationPhone?.trim() ? `&prefillPhone=${encodeURIComponent(item.destinationPhone.trim())}` : ""
                        }${item.callTypeId ? `&prefillCallTypeId=${encodeURIComponent(item.callTypeId)}` : ""}`}
                        className="shrink-0 rounded-lg border border-sky-400/40 bg-sky-500/20 px-2.5 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/30"
                      >
                        折り返し受信
                      </Link>
                      <span className="shrink-0 text-xs font-medium text-zinc-400">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
