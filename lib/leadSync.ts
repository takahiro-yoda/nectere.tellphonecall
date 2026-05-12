import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseCallMemo } from "@/lib/callFlow";
import {
  digitsOnlyPhone,
  parseCustomerActionLogs,
  callStatusToCustomerActionLabel,
  type CustomerActionLogEntry,
} from "@/lib/customers";

type CallForLeadSync = {
  id: string;
  leadId: string;
  destination: string;
  destinationContactName: string | null;
  destinationContactKana: string | null;
  destinationPhone: string | null;
  memo: string | null;
  status: string;
  createdAt: Date;
  callType: { name: string } | null;
  assignee: { name: string } | null;
};

function preferNonEmpty(next: string | null | undefined, prev: string | null | undefined): string | null {
  const t = next?.trim();
  if (t) return t;
  return prev?.trim() || null;
}

function buildActionMemo(call: CallForLeadSync, memoText: string): string {
  const parts: string[] = [];
  if (call.callType?.name) parts.push(`タイプ: ${call.callType.name}`);
  if (call.assignee?.name) parts.push(`担当: ${call.assignee.name}`);
  if (memoText) parts.push(memoText);
  if (parts.length === 0) parts.push(`架電ID: ${call.id}`);
  return parts.join(" · ");
}

export async function syncLeadFromCall(call: CallForLeadSync): Promise<void> {
  const parsed = parseCallMemo(call.memo);
  const memoText = parsed.memoText?.trim() ?? "";
  const entry: CustomerActionLogEntry = {
    date: call.createdAt.toISOString(),
    action: callStatusToCustomerActionLabel(call.status),
    memo: buildActionMemo(call, memoText),
  };

  const phoneDigits = digitsOnlyPhone(call.destinationPhone);

  const existing = await prisma.lead.findUnique({ where: { id: call.leadId } });
  if (!existing) return;

  const prevLogs = parseCustomerActionLogs(existing.actionLogs);
  const logs = [...prevLogs, entry].slice(-200);

  await prisma.lead.update({
    where: { id: call.leadId },
    data: {
      destination: call.destination.trim(),
      destinationContactName: preferNonEmpty(call.destinationContactName, existing.destinationContactName),
      destinationContactKana: preferNonEmpty(call.destinationContactKana, existing.destinationContactKana),
      destinationPhone: preferNonEmpty(phoneDigits, existing.destinationPhone),
      actionLogs: logs as Prisma.InputJsonValue,
    },
  });
}
