import Link from "next/link";
import { AssigneesManager } from "../components/AssigneesManager";
import { GoalsManager } from "../components/GoalsManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "管理 | Nectere",
  description: "架電目標・担当者の設定",
};

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              ← ホーム
            </Link>
            <h1 className="text-xl font-bold text-zinc-900">管理ダッシュボード</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <GoalsManager />
        <AssigneesManager />
      </main>
    </div>
  );
}
