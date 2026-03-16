"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ViewPeriod } from "@/lib/dateUtils";

const OPTIONS: { value: ViewPeriod; label: string }[] = [
  { value: "this-week", label: "今週" },
  { value: "last-week", label: "先週" },
  { value: "this-month", label: "今月" },
  { value: "last-month", label: "先月" },
];

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "this-week";
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";

  const isCustom = view === "custom";
  const validPreset = OPTIONS.some((o) => o.value === view) ? view : "this-week";

  const [fromInput, setFromInput] = useState(fromParam);
  const [toInput, setToInput] = useState(toParam);

  useEffect(() => {
    setFromInput(fromParam);
    setToInput(toParam);
  }, [fromParam, toParam]);

  function setViewPreset(v: ViewPeriod) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("view", v);
    next.delete("from");
    next.delete("to");
    router.push("?" + next.toString(), { scroll: false });
  }

  function applyCustomRange() {
    const from = fromInput.trim();
    const to = toInput.trim();
    if (!from || !to) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("view", "custom");
    next.set("from", from);
    next.set("to", to);
    router.push("?" + next.toString(), { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm">
      {/* プリセット期間（GSC風） */}
      <div className="flex items-center gap-0.5 rounded-md bg-zinc-100 p-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setViewPreset(opt.value as ViewPeriod)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              !isCustom && validPreset === opt.value
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 区切り線 */}
      <div className="h-6 w-px bg-zinc-200" aria-hidden />

      {/* カスタム日付範囲（GSC風：開始〜終了＋適用） */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="period-from">
          開始日
        </label>
        <input
          id="period-from"
          type="date"
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-zinc-400 font-medium">〜</span>
        <label className="sr-only" htmlFor="period-to">
          終了日
        </label>
        <input
          id="period-to"
          type="date"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={applyCustomRange}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            isCustom
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          表示
        </button>
      </div>
    </div>
  );
}
