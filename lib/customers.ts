function newActionLogEntryId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export type CustomerActionLogEntry = {
  /** 行の識別子（手入力・架電同期で使用） */
  id?: string;
  date: string;
  action: string;
  memo: string;
  /** 架電から自動追記された行のとき、同一架電の再同期用 */
  callId?: string;
};

export function normalizeDestination(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function digitsOnlyPhone(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const d = String(value).replace(/\D/g, "");
  return d.length > 0 ? d : null;
}

/** 同一顧客の突合: 電話番号（数字）があればそれを優先、なければ正規化した電話先名 */
export function buildCustomerMatchKey(destination: string, phone: string | null | undefined): string {
  const digits = digitsOnlyPhone(phone);
  if (digits) return `phone:${digits}`;
  return `dest:${normalizeDestination(destination)}`;
}

export function parseCustomerActionLogs(raw: unknown): CustomerActionLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomerActionLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.date !== "string" || typeof o.action !== "string" || typeof o.memo !== "string") continue;
    const callId = typeof o.callId === "string" && o.callId.trim() !== "" ? o.callId.trim() : undefined;
    const id = typeof o.id === "string" && o.id.trim() !== "" ? o.id.trim() : undefined;
    out.push({
      date: o.date,
      action: o.action,
      memo: o.memo,
      ...(id ? { id } : {}),
      ...(callId ? { callId } : {}),
    });
  }
  return out.slice(-200);
}

/** 同一 callId の行を置き換えつつ末尾に追加（架電の新規・編集でアクションログと一致させる） */
export function mergeActionLogEntryForCall(
  prev: CustomerActionLogEntry[],
  entry: CustomerActionLogEntry,
  callId: string
): CustomerActionLogEntry[] {
  const stableId = `call:${callId}`;
  const withId: CustomerActionLogEntry = { ...entry, id: stableId, callId };
  const filtered = prev.filter((e) => e.id !== stableId && e.callId !== callId);
  return [...filtered, withId].slice(-200);
}

/** 編集・削除用に欠けている id を付与（既存データの移行） */
export function ensureCustomerActionLogIds(logs: CustomerActionLogEntry[]): CustomerActionLogEntry[] {
  return logs.map((e) => (e.id?.trim() ? e : { ...e, id: newActionLogEntryId() }));
}

/** クライアントでも利用可（crypto.randomUUID） */
export function assignMissingActionLogIdsClient(logs: CustomerActionLogEntry[]): CustomerActionLogEntry[] {
  return ensureCustomerActionLogIds(logs);
}

/** 一覧用: 時系列の末尾＝直近のアクション */
export function getLastActionFromLogs(raw: unknown): {
  date: string;
  action: string;
  memoPreview: string;
} | null {
  const logs = parseCustomerActionLogs(raw);
  if (logs.length === 0) return null;
  const last = logs[logs.length - 1];
  const memo = last.memo.trim();
  const memoPreview = memo.length > 40 ? `${memo.slice(0, 40)}…` : memo;
  return { date: last.date, action: last.action.trim(), memoPreview };
}

/** replaceActionLogs 用の検証・正規化 */
export function parseReplaceActionLogsPayload(raw: unknown): CustomerActionLogEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const out: CustomerActionLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const date = typeof o.date === "string" ? o.date.trim() : "";
    const action = typeof o.action === "string" ? o.action.trim() : "";
    const memo = typeof o.memo === "string" ? o.memo : "";
    if (!date || !action) continue;
    const id = typeof o.id === "string" && o.id.trim() !== "" ? o.id.trim() : newActionLogEntryId();
    const callId = typeof o.callId === "string" && o.callId.trim() !== "" ? o.callId.trim() : undefined;
    out.push({ id, date, action, memo, ...(callId ? { callId } : {}) });
  }
  return out.slice(-200);
}

export function callStatusToCustomerActionLabel(status: string): string {
  switch (status) {
    case "APPOINTMENT":
      return "アポ取得";
    case "NO_ANSWER":
      return "未応答";
    case "SKIPPED":
      return "スキップ";
    case "OTHER":
      return "架電記録";
    default:
      return `架電 (${status})`;
  }
}

/** 手入力のアクションログ1件（API の append 用） */
export function createManualActionLogEntry(date: string, action: string, memo: string): CustomerActionLogEntry {
  return { id: newActionLogEntryId(), date, action, memo };
}
