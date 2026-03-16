"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function AuthSuccessBody() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  useEffect(() => {
    const timer = setTimeout(() => {
      // 認証画面を見た印（ループ防止）。2秒で消える
      document.cookie = "nectere_just_saw_auth=1; path=/; max-age=2";
      window.location.href = from;
    }, 900);
    return () => clearTimeout(timer);
  }, [from]);

  return (
    <div className="relative w-full max-w-xs overflow-hidden rounded-2xl bg-black/80 px-7 py-8 text-center shadow-[0_0_32px_rgba(0,0,0,0.9)] ring-1 ring-zinc-800 backdrop-blur">
      {/* 薄いグリッドと上部のライン */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-500/60 to-transparent" />

      <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-700">
        <svg
          className="h-6 w-6 text-zinc-100"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 13L9 17L19 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="relative mt-4 text-sm font-medium text-zinc-100">
        サインインしました
      </p>
      <p className="relative mt-1 text-xs text-zinc-500">
        ダッシュボードに移動しています…
      </p>

      {/* 小さなステータス行 */}
      <div className="relative mt-5 flex items-center justify-center gap-2 text-[10px] text-zinc-500">
        <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
        <span>セッションを準備中</span>
      </div>

      {/* 1本の細いプログレスライン＋光の走査 */}
      <div className="relative mt-5 h-px w-full overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full w-full origin-left bg-zinc-500"
          style={{ animation: "grow 0.9s ease-out forwards" }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(120deg,transparent,rgba(250,250,250,0.7),transparent)] [background-size:180%_100%] [animation:shine_0.9s_linear_infinite]" />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes shine {
          from { background-position: 180% 0; }
          to { background-position: -180% 0; }
        }
      `,
        }}
      />
    </div>
  );
}
