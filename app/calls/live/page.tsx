import { Suspense } from "react";
import { LiveCallClient } from "../../components/LiveCallClient";

export const dynamic = "force-dynamic";

export default function LiveCallPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">読み込み中…</div>}>
      <LiveCallClient />
    </Suspense>
  );
}
