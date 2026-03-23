"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PricingMatrixPayload } from "@/lib/pricingMatrix";
import { effectiveRevenueYenPerCourse } from "@/lib/pricingMatrix";

type Course = PricingMatrixPayload["courses"][number];

type Props = {
  initial: PricingMatrixPayload;
};

function formatYen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);
}

export function PlansManagerPanel({ initial }: Props) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initial.courses);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [revenue, setRevenue] = useState<number | "">("");
  const [variableCost, setVariableCost] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCourses(initial.courses);
  }, [initial.courses]);

  function openNew() {
    setEditing("new");
    setName("新しいプラン");
    setRevenue("");
    setVariableCost(0);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Course) {
    setEditing(c);
    setName(c.name);
    setRevenue(c.revenuePerContractYen > 0 ? c.revenuePerContractYen : "");
    setVariableCost(c.variableCostPerContractYen);
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeModal();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function save() {
    const rev = revenue === "" ? 0 : Number(revenue);
    const vc = variableCost === "" ? 0 : Number(variableCost);
    if (!name.trim()) {
      setError("プラン名を入力してください");
      return;
    }
    if (Number.isNaN(rev) || rev < 0 || !Number.isInteger(rev)) {
      setError("売上単価は 0 以上の整数で入力してください");
      return;
    }
    if (Number.isNaN(vc) || vc < 0 || !Number.isInteger(vc)) {
      setError("変動経費は 0 以上の整数で入力してください");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (editing === "new") {
        const res = await fetch("/api/pricing/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            revenuePerContractYen: rev,
            variableCostPerContractYen: vc,
          }),
        });
        if (!res.ok) throw new Error("create failed");
      } else if (editing !== null && typeof editing === "object") {
        const res = await fetch(`/api/pricing/courses/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            revenuePerContractYen: rev,
            variableCostPerContractYen: vc,
          }),
        });
        if (!res.ok) throw new Error("update failed");
      }
      closeModal();
      router.refresh();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Course) {
    if (!confirm(`「${c.name}」を削除しますか？関連する月次目標も失われます。`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/pricing/courses/${c.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          プランごとに<strong className="font-medium text-zinc-800"> 売上単価</strong>と
          <strong className="font-medium text-zinc-800"> 変動経費（1件あたり）</strong>をまとめて設定します。変動経費を 0
          にすると、試算用設定の「契約1件あたり変動費」を使います。
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={openNew}
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          プランを追加
        </button>
      </div>

      {courses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500">
          プランがありません。「プランを追加」から作成してください。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 font-semibold text-zinc-700">プラン</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">売上単価（1件）</th>
                <th className="px-4 py-3 font-semibold text-zinc-700">変動経費（1件）</th>
                <th className="w-40 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const effectiveRev = effectiveRevenueYenPerCourse(initial, c.id);
                const revDisplay =
                  c.revenuePerContractYen > 0
                    ? formatYen(c.revenuePerContractYen)
                    : effectiveRev != null
                      ? `${formatYen(effectiveRev)}（旧区分から）`
                      : "未設定（標準単価で試算）";
                const varDisplay =
                  c.variableCostPerContractYen > 0
                    ? formatYen(c.variableCostPerContractYen)
                    : "全体設定に従う";
                return (
                  <tr key={c.id} className="border-b border-zinc-100">
                    <td className="px-4 py-3 font-medium text-zinc-900">{c.name}</td>
                    <td className="px-4 py-3 text-zinc-700">{revDisplay}</td>
                    <td className="px-4 py-3 text-zinc-700">{varDisplay}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openEdit(c)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => remove(c)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-modal-title"
          >
            <h3 id="plan-modal-title" className="text-lg font-semibold text-zinc-900">
              {editing === "new" ? "プランを追加" : "プランを編集"}
            </h3>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">プラン名</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">契約1件あたりの売上（円）</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value === "" ? "" : Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-zinc-500">0 の場合は標準単価、または旧区分マスの平均があればそれを使用します。</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">契約1件あたりの変動経費（円）</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={variableCost}
                  onChange={(e) => setVariableCost(e.target.value === "" ? "" : Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-zinc-500">0 の場合は試算用の「契約1件あたり変動費・原価」を使います。</p>
              </div>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={busy}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {busy ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
