const MAX_TAG_NAME_LEN = 80;

export function normalizeRecordTagName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_NAME_LEN);
}

export function isValidRecordTagName(normalized: string): boolean {
  return normalized.length > 0 && normalized.length <= MAX_TAG_NAME_LEN;
}
