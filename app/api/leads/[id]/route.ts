import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createManualActionLogEntry,
  digitsOnlyPhone,
  ensureCustomerActionLogIds,
  parseCustomerActionLogs,
  parseReplaceActionLogsPayload,
} from "@/lib/customers";
import { parseRecordUrls, parseUrlsFromRequestBody } from "@/lib/extraUrls";
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

  const body = (await request.json()) as Record<string, unknown>;
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
    replaceActionLogs,
    updateActionLog,
    deleteActionLogId,
    urls: urlsBody,
  } = body;

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

  const nextUrls =
    urlsBody === undefined
      ? parseRecordUrls((existing as { urls?: unknown }).urls)
      : (parseUrlsFromRequestBody(urlsBody) ?? []);

  let nextStatus = existing.status;
  if (typeof statusRaw === "string") {
    const parsed = parseLeadStatus(statusRaw);
    if (parsed) nextStatus = parsed;
  }

  let logs = ensureCustomerActionLogIds(parseCustomerActionLogs(existing.actionLogs));
  let logsDirty = false;

  if (replaceActionLogs !== undefined) {
    const parsed = parseReplaceActionLogsPayload(replaceActionLogs);
    if (parsed === null) {
      return NextResponse.json({ error: "replaceActionLogs が不正です" }, { status: 400 });
    }
    logs = parsed;
    logsDirty = true;
  } else {
    if (updateActionLog && typeof updateActionLog === "object" && updateActionLog !== null) {
      const u = updateActionLog as Record<string, unknown>;
      const eid = typeof u.id === "string" ? u.id.trim() : "";
      if (!eid) {
        return NextResponse.json({ error: "updateActionLog.id が必要です" }, { status: 400 });
      }
      const idx = logs.findIndex((x) => x.id === eid);
      if (idx === -1) {
        return NextResponse.json({ error: "該当するアクションログがありません" }, { status: 404 });
      }
      const cur = logs[idx];
      const nextDate = typeof u.date === "string" && u.date.trim() !== "" ? u.date.trim() : cur.date;
      const nextAction = typeof u.action === "string" && u.action.trim() !== "" ? u.action.trim() : cur.action;
      const nextMemoLog = typeof u.memo === "string" ? u.memo : cur.memo;
      logs = [...logs];
      logs[idx] = { ...cur, date: nextDate, action: nextAction, memo: nextMemoLog };
      logsDirty = true;
    }
    if (typeof deleteActionLogId === "string" && deleteActionLogId.trim() !== "") {
      const del = deleteActionLogId.trim();
      const before = logs.length;
      logs = logs.filter((x) => x.id !== del);
      if (logs.length !== before) logsDirty = true;
    }
    if (appendAction && typeof appendAction === "object" && appendAction !== null) {
      const o = appendAction as Record<string, unknown>;
      const d = typeof o.date === "string" ? o.date.trim() : "";
      const a = typeof o.action === "string" ? o.action.trim() : "";
      const m = typeof o.memo === "string" ? o.memo.trim() : "";
      if (d && a) {
        logs = [...logs, createManualActionLogEntry(d, a, m)].slice(-200);
        logsDirty = true;
      }
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
    urls: nextUrls as Prisma.InputJsonValue,
  };
  if (logsDirty) {
    data.actionLogs = logs as Prisma.InputJsonValue;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}
