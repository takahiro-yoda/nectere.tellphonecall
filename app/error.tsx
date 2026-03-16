"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDbError =
    error.message?.includes("Prisma") ||
    error.message?.includes("DATABASE") ||
    error.message?.includes("connect") ||
    error.message?.includes("Connection");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-zinc-900">エラーが発生しました</h1>
        {isDbError ? (
          <>
            <p className="mt-3 text-sm text-zinc-600">
              データベースに接続できていません。Vercel の環境変数で
              <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                DATABASE_URL
              </code>
              が設定されているか、本番用 DB にスキーマを反映（
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                npx prisma db push
              </code>
              ）済みか確認してください。
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Digest: {error.digest ?? "—"}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">{error.message}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
