import Link from "next/link";
import { CallScriptsManager } from "../../../components/CallScriptsManager";

export const dynamic = "force-dynamic";

export default async function CallScriptByTypePage({
  params,
}: {
  params: Promise<{ callTypeId: string }>;
}) {
  const { callTypeId } = await params;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <Link href="/admin" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
            ← 管理ダッシュボードへ戻る
          </Link>
          <h1 className="text-xl font-bold text-zinc-900">通話スクリプト管理</h1>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <CallScriptsManager fixedCallTypeId={callTypeId} hideTypeSelector />
      </main>
    </div>
  );
}
