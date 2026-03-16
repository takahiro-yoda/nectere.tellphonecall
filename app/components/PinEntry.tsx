"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PinEntry() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    if (pin.length !== 4) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました");
        setPin("");
        return;
      }
      // 一瞬かっこいい認証画面を経由してから遷移
      window.location.href = `/auth/success?from=${encodeURIComponent(from)}`;
    } catch {
      setError("通信エラー");
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [pin, from]);

  useEffect(() => {
    if (pin.length === 4) submit();
  }, [pin, submit]);

  // マウント時にキーボード入力用 input にフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDigit = (d: string) => {
    if (d === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    if (d === "" || pin.length >= 4) return;
    setPin((p) => p + d);
    setError("");
  };

  return (
    <div className="relative rounded-2xl border border-zinc-700/60 bg-zinc-800/80 p-8 shadow-xl backdrop-blur">
      {/* 隠し入力（モバイルで数字キーボード用） */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={4}
        value={pin}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
          setPin(v);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace") {
            setPin((p) => p.slice(0, -1));
            setError("");
          }
          if (e.key === "Enter" && pin.length === 4) {
            e.preventDefault();
            submit();
          }
        }}
        className="absolute left-0 right-0 top-0 h-24 cursor-default opacity-0"
        style={{ caretColor: "transparent" }}
        aria-label="PIN入力（4桁の数字をキーボードまたは下のキーで入力）"
        tabIndex={0}
      />

      {/* 4つのドット（クリックでキーボード入力可能） */}
      <button
        type="button"
        className="mb-8 flex w-full justify-center gap-3 focus:outline-none focus:ring-0"
        onClick={() => inputRef.current?.focus()}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`inline-block h-4 w-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length
                ? "scale-110 border-emerald-400 bg-emerald-400"
                : "border-zinc-500 bg-transparent"
            }`}
          />
        ))}
      </button>

      {error && (
        <p className="mb-4 text-center text-sm font-medium text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* テンキー */}
      <div className="grid grid-cols-3 gap-3">
        {DIGITS.map((d) => (
          <button
            key={d || "empty"}
            type="button"
            disabled={loading || (d === "" && true)}
            onClick={() => handleDigit(d)}
            className={`flex h-14 items-center justify-center rounded-xl text-xl font-semibold transition active:scale-95 disabled:pointer-events-none ${
              d === ""
                ? "cursor-default bg-transparent"
                : "bg-zinc-700/80 text-white hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {loading && (
        <p className="mt-4 text-center text-xs text-zinc-500">確認中...</p>
      )}
    </div>
  );
}
