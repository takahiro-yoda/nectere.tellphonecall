import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  digitsOnlyPhone,
  parseCustomerActionLogs,
  type CustomerActionLogEntry,
} from "@/lib/customers";
import { normalizeEmailInput, normalizePrefectureInput } from "@/lib/japanPrefectures";
import { parseLeadStatus } from "@/lib/leadStatus";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const {
    destination,
    destinationContactName,
    destinationContactKana,
    destinationPhone,
    memo,
    prefecture,
    addressLine,
    email,
    status: statusRaw,
    appendAction,
  } = body as Record<string, unknown>;

  const nextDestination =
    typeof destination === "string" && destination.trim() !== "" ? destination.trim() : existing.destination;
  const nextContactName =
    typeof destinationContactName === "string"
      ? destinationContactName.trim() || null
      : existing.destinationContactName;
  const nextContactKana =
    typeof destinationContactKana === "string"
      ? destinationContactKana.trim() || null
      : existing.destinationContactKana;
  const nextPhoneRaw =
    typeof destinationPhone === "string" ? destinationPhone.trim() || null : existing.destinationPhone;
  const nextPhoneDigits = nextPhoneRaw != null ? digitsOnlyPhone(nextPhoneRaw) : null;

  const nextMemo = typeof memo === "string" ? memo.trim() || null : existing.memo;

  const nextPrefecture =
    typeof prefecture === "string" ? normalizePrefectureInput(prefecture) : existing.prefecture;
  const nextAddressLine =
    typeof addressLine === "string" ? addressLine.trim() || null : existing.addressLine;
  const nextEmail =
    typeof email === "string" ? normalizeEmailInput(email) : normalizeEmailInput(existing.email);

  let nextStatus = existing.status;
  if (typeof statusRaw === "string") {
    const parsed = parseLeadStatus(statusRaw);
    if (parsed) nextStatus = parsed;
  }

  let logs = parseCustomerActionLogs(existing.actionLogs);
  if (appendAction && typeof appendAction === "object" && appendAction !== null) {
    const o = appendAction as Record<string, unknown>;
    const d = typeof o.date === "string" ? o.date.trim() : "";
    const a = typeof o.action === "string" ? o.action.trim() : "";
    const m = typeof o.memo === "string" ? o.memo.trim() : "";
    if (d && a) {
      const entry: CustomerActionLogEntry = { date: d, action: a, memo: m };
      logs = [...logs, entry].slice(-200);
    }
  }

  const data: Prisma.LeadUpdateInput = {
    destination: nextDestination,
    destinationContactName: nextContactName,
    destinationContactKana: nextContactKana,
    destinationPhone: nextPhoneDigits,
    memo: nextMemo,
    prefecture: nextPrefecture,
    addressLine: nextAddressLine,
    email: nextEmail,
    status: nextStatus,
    actionLogs: logs as Prisma.InputJsonValue,
  };

  const updated = await prisma.lead.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}
