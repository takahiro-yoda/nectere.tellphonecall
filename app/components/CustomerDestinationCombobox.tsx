"use client";

import { useEffect, useId, useState } from "react";

export type CustomerPickSuggestion = {
  id: string;
  destination: string;
  destinationContactName: string | null;
  destinationContactKana: string | null;
  destinationPhone: string | null;
};

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick?: (row: CustomerPickSuggestion) => void;
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
  /** 候補APIのパス（例: /api/leads/suggestions） */
  suggestionsPath?: string;
};

export function CustomerDestinationCombobox({
  id,
  label,
  value,
  onChange,
  onPick,
  placeholder,
  required,
  inputClassName,
  suggestionsPath = "/api/customers/suggestions",
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CustomerPickSuggestion[]>([]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setItems([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${suggestionsPath}?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { items?: CustomerPickSuggestion[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [value, suggestionsPath]);

  function handlePick(row: CustomerPickSuggestion) {
    onChange(row.destination);
    onPick?.(row);
    setOpen(false);
  }

  const showList = open && (items.length > 0 || loading);

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        required={required}
        value={value}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        className={
          inputClassName ??
          "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
        }
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {loading && items.length === 0 ? (
            <li className="px-3 py-2 text-xs text-zinc-500">読み込み中…</li>
          ) : null}
          {items.map((row) => (
            <li key={row.id} role="option">
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-zinc-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(row)}
              >
                <span className="font-medium text-zinc-900">{row.destination}</span>
                <span className="mt-0.5 text-xs text-zinc-500">
                  {[row.destinationContactName, row.destinationPhone].filter(Boolean).join(" / ") || "詳細未登録"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
