import { digitsOnlyPhone } from "@/lib/customers";

const MEMO_MAX = 900;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/** 架電ダッシュボード「記録開始」モーダル用のクエリ（AddCallForm の searchParams と一致） */
export function buildCallsPrefillSearch(input: {
  destination: string;
  destinationContactName?: string | null;
  destinationContactKana?: string | null;
  destinationPhone?: string | null;
  memoLines?: string[];
  /** 顧客DBの行と架電記録を紐づける */
  customerId?: string | null;
  /** 営業先リストの行と架電記録を紐づける */
  leadId?: string | null;
}): string {
  const dest = input.destination.trim();
  const params = new URLSearchParams();
  if (!dest) return "";
  params.set("prefillDestination", dest);
  const name = input.destinationContactName?.trim();
  const kana = input.destinationContactKana?.trim();
  const phone = digitsOnlyPhone(input.destinationPhone);
  if (name) params.set("prefillContactName", name);
  if (kana) params.set("prefillContactKana", kana);
  if (phone) params.set("prefillPhone", phone);
  const memoBody = (input.memoLines ?? []).filter((l) => l.trim() !== "").join("\n");
  if (memoBody) params.set("prefillMemo", truncate(memoBody, MEMO_MAX));
  const cid = input.customerId?.trim();
  const lid = input.leadId?.trim();
  if (cid) params.set("prefillCustomerId", cid);
  if (lid) params.set("prefillLeadId", lid);
  return params.toString();
}

export function buildCallsPrefillHref(input: Parameters<typeof buildCallsPrefillSearch>[0]): string {
  const q = buildCallsPrefillSearch(input);
  return q ? `/calls?${q}` : "/calls";
}
