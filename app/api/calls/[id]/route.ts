import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCallMemo, serializeCallMemo, type ScriptFlowData } from "@/lib/callFlow";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const call = await prisma.call.findUnique({
    where: { id },
    include: { assignee: true, callType: true },
  });
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = parseCallMemo(call.memo);
  return NextResponse.json({
    ...call,
    memo: parsed.memoText,
    scriptFlow: parsed.scriptFlow,
  });
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await _request.json();
  const {
    destination,
    destinationContactName,
    destinationContactKana,
    destinationPhone,
    memo,
    assigneeId,
    callTypeId,
    isAppointment,
    status,
    createdAt,
    scriptFlow,
  } = body;

  const data: {
    destination?: string;
    destinationContactName?: string | null;
    destinationContactKana?: string | null;
    destinationPhone?: string | null;
    memo?: string | null;
    assignee?:
      | {
          connect: { id: string };
        }
      | {
          disconnect: true;
        };
    callType?:
      | {
          connect: { id: string };
        }
      | {
          disconnect: true;
        };
    isAppointment?: boolean;
    status?: "APPOINTMENT" | "NO_ANSWER" | "OTHER" | "SKIPPED";
    createdAt?: Date;
  } = {};
  if (typeof destination === "string" && destination.trim() !== "")
    data.destination = destination.trim();
  if (destinationContactName !== undefined) {
    data.destinationContactName =
      typeof destinationContactName === "string" && destinationContactName.trim() !== ""
        ? destinationContactName.trim()
        : null;
  }
  if (destinationContactKana !== undefined) {
    data.destinationContactKana =
      typeof destinationContactKana === "string" && destinationContactKana.trim() !== ""
        ? destinationContactKana.trim()
        : null;
  }
  if (destinationPhone !== undefined) {
    data.destinationPhone =
      typeof destinationPhone === "string" && destinationPhone.trim() !== ""
        ? String(destinationPhone).replace(/\D/g, "")
        : null;
  }
  if (memo !== undefined || scriptFlow !== undefined) {
    const existing = await prisma.call.findUnique({
      where: { id },
      select: { memo: true },
    });
    const parsed = parseCallMemo(existing?.memo);
    data.memo = serializeCallMemo({
      memoText: memo !== undefined ? (memo != null ? String(memo).trim() || null : null) : parsed.memoText,
      scriptFlow: scriptFlow !== undefined ? (isScriptFlowData(scriptFlow) ? scriptFlow : null) : parsed.scriptFlow,
    });
  }
  if (assigneeId !== undefined) {
    data.assignee =
      assigneeId == null || assigneeId === ""
        ? { disconnect: true }
        : {
            connect: { id: assigneeId },
          };
  }
  if (callTypeId !== undefined) {
    data.callType =
      callTypeId == null || callTypeId === ""
        ? { disconnect: true }
        : {
            connect: { id: callTypeId },
          };
  }
  if (typeof isAppointment === "boolean") data.isAppointment = isAppointment;
  if (
    status === "APPOINTMENT" ||
    status === "NO_ANSWER" ||
    status === "OTHER" ||
    status === "SKIPPED"
  ) {
    data.status = status;
  }
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      data.createdAt = d;
    }
  }

  const updated = await prisma.call.update({
    where: { id },
    data,
    include: { assignee: true, callType: true },
  });
  const parsed = parseCallMemo(updated.memo);
  return NextResponse.json({
    ...updated,
    memo: parsed.memoText,
    scriptFlow: parsed.scriptFlow,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.call.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function isScriptFlowData(value: unknown): value is ScriptFlowData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ScriptFlowData>;
  return data.version === 1 && typeof data.callTypeId === "string" && Array.isArray(data.nodePath) && Array.isArray(data.steps);
}
