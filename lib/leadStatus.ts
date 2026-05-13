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

/** 一覧・詳細のステータス pill 用（Tailwind） */
export function leadStatusChipClasses(status: LeadStatus): string {
  const palette: Record<LeadStatus, string> = {
    HOT_LEADS: "bg-red-100 text-red-900 ring-red-300/70",
    WARM_LEADS: "bg-orange-100 text-orange-950 ring-orange-300/70",
    REACHED_OUT: "bg-sky-100 text-sky-950 ring-sky-300/70",
    OUTREACH_PLANNED: "bg-violet-100 text-violet-900 ring-violet-300/70",
    QUALIFIED: "bg-emerald-100 text-emerald-950 ring-emerald-300/70",
    RESEARCHING: "bg-slate-100 text-slate-800 ring-slate-300/70",
    FOLLOWUP_NEEDED: "bg-amber-100 text-amber-950 ring-amber-300/70",
    NOT_INTERESTED: "bg-zinc-200 text-zinc-800 ring-zinc-400/60",
    INACTIVE: "bg-neutral-100 text-neutral-600 ring-neutral-300/70",
    UNQUALIFIED: "bg-rose-100 text-rose-900 ring-rose-300/70",
  };
  const colors = palette[status] ?? "bg-zinc-100 text-zinc-800 ring-zinc-300/70";
  return `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${colors}`;
}

const SET = new Set(LEAD_STATUS_OPTIONS.map((o) => o.value));

export function parseLeadStatus(value: string | null | undefined): LeadStatus | null {
  if (!value || !SET.has(value as LeadStatus)) return null;
  return value as LeadStatus;
}
