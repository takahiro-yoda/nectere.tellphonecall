import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCallMemo, serializeCallMemo, type ScriptFlowData } from "@/lib/callFlow";
import { getRangeForView, parseCustomDateRange, type ViewPeriod } from "@/lib/dateUtils";

const RANGE_MAP: Record<string, ViewPeriod> = {
  week: "this-week",
  "last-week": "last-week",
  month: "this-month",
  "last-month": "last-month",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let start: Date;
  let end: Date;

  if (rangeParam === "custom" && fromParam != null && toParam != null) {
    const range = parseCustomDateRange(fromParam, toParam);
    if (!range) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    start = range.start;
    end = range.end;
  } else {
    const view = rangeParam ? RANGE_MAP[rangeParam] : null;
    if (!view) return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    const r = getRangeForView(view);
    start = r.start;
    end = r.end;
  }

  const calls = await prisma.call.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      destination: true,
      destinationContactName: true,
      destinationContactKana: true,
      destinationPhone: true,
      memo: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, color: true } },
      callTypeId: true,
      callType: { select: { id: true, name: true } },
      isAppointment: true,
      status: true,
      createdAt: true,
    },
  });
  return NextResponse.json(
    calls.map((call) => {
      const parsed = parseCallMemo(call.memo);
      return {
        ...call,
        memo: parsed.memoText,
        scriptFlow: parsed.scriptFlow,
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    destination,
    destinationContactName,
    destinationContactKana,
    destinationPhone,
    memo,
    createdAt,
    assigneeId,
    callTypeId,
    isAppointment,
    status,
    scriptFlow,
  } = body;

  if (!destination || typeof destination !== "string" || destination.trim() === "") {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }

  try {
    const created = await prisma.call.create({
      data: {
        destination: destination.trim(),
        destinationContactName:
          typeof destinationContactName === "string" && destinationContactName.trim() !== ""
            ? destinationContactName.trim()
            : null,
        destinationContactKana:
          typeof destinationContactKana === "string" && destinationContactKana.trim() !== ""
            ? destinationContactKana.trim()
            : null,
        destinationPhone:
          typeof destinationPhone === "string" && destinationPhone.trim() !== ""
            ? String(destinationPhone).replace(/\D/g, "")
            : null,
        memo: serializeCallMemo({
          memoText: memo != null ? String(memo).trim() || null : null,
          scriptFlow: isScriptFlowData(scriptFlow) ? scriptFlow : null,
        }),
        assignee:
          assigneeId == null || assigneeId === ""
            ? undefined
            : {
                connect: { id: assigneeId },
              },
        callType:
          callTypeId == null || callTypeId === ""
            ? undefined
            : {
                connect: { id: callTypeId },
              },
        isAppointment: Boolean(isAppointment),
        status:
          status === "APPOINTMENT" ||
          status === "NO_ANSWER" ||
          status === "OTHER" ||
          status === "SKIPPED"
            ? status
            : Boolean(isAppointment)
              ? "APPOINTMENT"
              : "OTHER",
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
      include: { assignee: true, callType: true },
    });
    const parsed = parseCallMemo(created.memo);
    return NextResponse.json({
      ...created,
      memo: parsed.memoText,
      scriptFlow: parsed.scriptFlow,
    });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("Failed to create call", e);
    return NextResponse.json(
      {
        error: "サーバー内部エラーです。管理者にお問い合わせください。",
        detail,
      },
      { status: 500 },
    );
  }
}

function isScriptFlowData(value: unknown): value is ScriptFlowData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ScriptFlowData>;
  return data.version === 1 && typeof data.callTypeId === "string" && Array.isArray(data.nodePath) && Array.isArray(data.steps);
}
