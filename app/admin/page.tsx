import { AssigneesManager } from "../components/AssigneesManager";
import { CallTypesManager } from "../components/CallTypesManager";
import { GoalsManager } from "../components/GoalsManager";
import { HamburgerMenu } from "../components/HamburgerMenu";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "管理 | Nectere",
  description: "架電目標・担当者・通話タイプの設定",
};

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <HamburgerMenu />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">管理ダッシュボード</h1>
              <p className="text-xs font-medium text-zinc-400">目標・担当者・通話タイプの設定</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <GoalsManager />
        <AssigneesManager />
        <CallTypesManager />
      </main>
    </div>
  );
}
