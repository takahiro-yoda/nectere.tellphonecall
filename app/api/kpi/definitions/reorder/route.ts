import { NextRequest, NextResponse } from "next/server";
import { reorderKpiDefinitions } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.filter((id: unknown) => typeof id === "string" && id.trim())
      : [];

    if (orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
    }

    await reorderKpiDefinitions(orderedIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/kpi/definitions/reorder]", err);
    return NextResponse.json({ error: "reorder failed" }, { status: 400 });
  }
}
