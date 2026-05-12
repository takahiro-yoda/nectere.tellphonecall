import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildCustomerMatchKey,
  digitsOnlyPhone,
  parseCustomerActionLogs,
  type CustomerActionLogEntry,
} from "@/lib/customers";
import { normalizeEmailInput, normalizePrefectureInput } from "@/lib/japanPrefectures";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id } });
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
    appendAction,
  } = body as {
    destination?: unknown;
    destinationContactName?: unknown;
    destinationContactKana?: unknown;
    destinationPhone?: unknown;
    memo?: unknown;
    prefecture?: unknown;
    addressLine?: unknown;
    email?: unknown;
    appendAction?: { date?: unknown; action?: unknown; memo?: unknown };
  };

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

  let logs = parseCustomerActionLogs(existing.actionLogs);
  if (appendAction && typeof appendAction === "object") {
    const d = typeof appendAction.date === "string" ? appendAction.date.trim() : "";
    const a = typeof appendAction.action === "string" ? appendAction.action.trim() : "";
    const m = typeof appendAction.memo === "string" ? appendAction.memo.trim() : "";
    if (d && a) {
      const entry: CustomerActionLogEntry = { date: d, action: a, memo: m };
      logs = [...logs, entry].slice(-200);
    }
  }

  const nextMatchKey = buildCustomerMatchKey(nextDestination, nextPhoneDigits);
  if (nextMatchKey !== existing.matchKey) {
    const clash = await prisma.customer.findUnique({ where: { matchKey: nextMatchKey } });
    if (clash && clash.id !== id) {
      return NextResponse.json(
        { error: "同じ電話番号または電話先名の顧客が既に存在します" },
        { status: 409 },
      );
    }
  }

  const data: Prisma.CustomerUpdateInput = {
    matchKey: nextMatchKey,
    destination: nextDestination,
    destinationContactName: nextContactName,
    destinationContactKana: nextContactKana,
    destinationPhone: nextPhoneDigits,
    memo: nextMemo,
    prefecture: nextPrefecture,
    addressLine: nextAddressLine,
    email: nextEmail,
    actionLogs: logs as Prisma.InputJsonValue,
  };

  const updated = await prisma.customer.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}
