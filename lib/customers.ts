export type CustomerActionLogEntry = {
  date: string;
  action: string;
  memo: string;
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
    out.push({ date: o.date, action: o.action, memo: o.memo });
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
