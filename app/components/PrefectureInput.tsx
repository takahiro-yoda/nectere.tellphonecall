"use client";

import { useId } from "react";
import { JAPAN_PREFECTURES } from "@/lib/japanPrefectures";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  /** ラベルのクラス（架電詳細などで統一したいとき） */
  labelClassName?: string;
};

export function PrefectureInput({ id, label, value, onChange, className, labelClassName }: Props) {
  const listId = useId();

  return (
    <div>
      <label htmlFor={id} className={labelClassName ?? "block text-xs font-medium text-zinc-600"}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: 東京都（一覧から選ぶか入力）"
        autoComplete="address-level1"
        className={
          className ??
          "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
        }
      />
      <datalist id={listId}>
        {JAPAN_PREFECTURES.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <p className="mt-0.5 text-[11px] text-zinc-500">47都道府県は候補から選べます。未掲載の表記はそのまま入力可能です。</p>
    </div>
  );
}
