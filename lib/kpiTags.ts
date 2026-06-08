export {
  normalizeRecordTagName,
  normalizeRecordTagName as normalizeKpiTagName,
  isValidRecordTagName,
  isValidRecordTagName as isValidKpiTagName,
} from "@/lib/recordTags";

export type KpiTagLite = { id: string; name: string; color: string | null };
