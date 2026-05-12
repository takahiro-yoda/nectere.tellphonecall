import type { LeadStatus } from "@prisma/client";

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "HOT_LEADS", label: "Hot leads" },
  { value: "WARM_LEADS", label: "Warm leads" },
  { value: "REACHED_OUT", label: "Reached out" },
  { value: "OUTREACH_PLANNED", label: "Outreach planned" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "RESEARCHING", label: "Researching" },
  { value: "FOLLOWUP_NEEDED", label: "Follow-up needed" },
  { value: "NOT_INTERESTED", label: "Not interested" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "UNQUALIFIED", label: "Unqualified" },
];

export function leadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

const SET = new Set(LEAD_STATUS_OPTIONS.map((o) => o.value));

export function parseLeadStatus(value: string | null | undefined): LeadStatus | null {
  if (!value || !SET.has(value as LeadStatus)) return null;
  return value as LeadStatus;
}
