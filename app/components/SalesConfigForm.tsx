"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type SalesPayload = {
  defaultRevenuePerContractYen: number;
  monthlyFixedExpenseYen: number;
  variableCostPerContractYen: number;
};

export function SalesConfigForm() {
  const router = useRouter();
  const [revenuePer, setRevenuePer] = useState<number | "">("");
  const [fixedMonthly, setFixedMonthly] = useState<number | "">("");
  const [variablePer, setVariablePer] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sales-config")
      .then((res) => res.json())
      .then((data: SalesPayload) => {
        if (typeof data.defaultRevenuePerContractYen === "number") {
          setRevenuePer(data.defaultRevenuePerContractYen);
        }
        if (typeof data.monthlyFixedExpenseYen === "number") {
          setFixedMonthly(data.monthlyFixedExpenseYen);
        }
        if (typeof data.variableCostPerContractYen === "number") {
          setVariablePer(data.variableCostPerContractYen);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const a = revenuePer === "" ? NaN : Number(revenuePer);
    const b = fixedMonthly === "" ? NaN : Number(fixedMonthly);
    const c = variablePer === "" ? NaN : Number(variablePer);
    if (
      Number.isNaN(a) ||
      Number.isNaN(b) ||
      Number.isNaN(c) ||
      a < 0 ||
      b < 0 ||
      c < 0 ||
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      !Number.isInteger(c)
    ) {
      setError("すべて 0 以上の整数で入力してください");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/sales-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultRevenuePerContractYen: a,
          monthlyFixedExpenseYen: b,
          variableCostPerContractYen: c,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "保存に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-zinc-500">読み込み中…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">試算用・単価と経費</h2>
      <p className="mt-1 text-sm text-zinc-500">
        標準単価は「契約 1 件あたりの売上」のデフォルトです。料金表のプラン行に金額が無いときのフォールバックにも使います。ここの月次固定経費は全月共通です。
        <strong className="font-medium text-zinc-700"> 月ごとの上乗せ経費</strong>
        は「契約目標」の表（1月〜12月）から入力します。変動費は利益試算に使います。
      </p>
      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">標準単価（売上 / 件）</label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={revenuePer}
              onChange={(e) => setRevenuePer(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-40 rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-zinc-600">円 / 件</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">月次固定経費</label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={fixedMonthly}
              onChange={(e) => setFixedMonthly(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-40 rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-zinc-600">円 / 月</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">契約 1 件あたり変動費・原価</label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={variablePer}
              onChange={(e) => setVariablePer(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-40 rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-zinc-600">円 / 件</span>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
