import { Suspense } from "react";
import { PinEntry } from "../components/PinEntry";

export const metadata = {
  title: "ログイン | 架電数ダッシュボード",
  description: "4桁のPINを入力してアクセス",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            架電数ダッシュボード
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            4桁のPINを入力（キーボードまたは下のキー）
          </p>
        </div>
        <Suspense fallback={null}>
          <PinEntry />
        </Suspense>
      </div>
    </div>
  );
}
