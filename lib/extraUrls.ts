const MAX_URLS = 30;

/** 1件の URL を http(s) の絶対URLへ正規化（スキーム省略時は https） */
export function normalizeOneUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(t) ? t : `https://${t}`;
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** DB / API 用: JSON 配列から正規化した URL 一覧 */
export function parseRecordUrls(raw: unknown, max = MAX_URLS): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const u = normalizeOneUrl(x);
    if (u) out.push(u);
  }
  return [...new Set(out)].slice(0, max);
}

export function parseUrlsFromRequestBody(value: unknown): string[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return [];
  return parseRecordUrls(value);
}
