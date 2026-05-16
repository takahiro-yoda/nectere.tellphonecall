import type { ListSortPreset } from "@/lib/customerLeadListSort";
import { LIST_SORT_PRESET_OPTIONS } from "@/lib/customerLeadListSort";

export type LeadsListFilters = {
  q: string;
  status: string;
  prefecture: string;
  tag: string;
  sort: ListSortPreset;
};

const DEFAULT_SORT: ListSortPreset = "updated_desc";

const SORT_VALUES = new Set<ListSortPreset>(LIST_SORT_PRESET_OPTIONS.map((o) => o.value));

export function parseLeadsListSort(raw: string | undefined | null): ListSortPreset {
  const v = (raw ?? "").trim();
  if (SORT_VALUES.has(v as ListSortPreset)) return v as ListSortPreset;
  return DEFAULT_SORT;
}

type SearchInput = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(input: SearchInput, key: string): string {
  if (input instanceof URLSearchParams) {
    return (input.get(key) ?? "").trim();
  }
  const v = input[key];
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim();
  return "";
}

export function parseLeadsListFilters(input: SearchInput): LeadsListFilters {
  return {
    q: readParam(input, "q"),
    status: readParam(input, "status"),
    prefecture: readParam(input, "prefecture"),
    tag: readParam(input, "tag"),
    sort: parseLeadsListSort(readParam(input, "sort")),
  };
}

export function buildLeadsListSearchParams(filters: Partial<LeadsListFilters>): string {
  const sp = new URLSearchParams();
  const q = (filters.q ?? "").trim();
  const status = (filters.status ?? "").trim();
  const prefecture = (filters.prefecture ?? "").trim();
  const tag = (filters.tag ?? "").trim();
  const sort = filters.sort ?? DEFAULT_SORT;

  if (q) sp.set("q", q);
  if (status) sp.set("status", status);
  if (prefecture) sp.set("prefecture", prefecture);
  if (tag) sp.set("tag", tag);
  if (sort !== DEFAULT_SORT) sp.set("sort", sort);

  return sp.toString();
}

export function buildLeadsListHref(filters: Partial<LeadsListFilters> | SearchInput): string {
  const parsed = filters instanceof URLSearchParams || !("q" in (filters as object))
    ? parseLeadsListFilters(filters as SearchInput)
    : {
        q: "",
        status: "",
        prefecture: "",
        tag: "",
        sort: DEFAULT_SORT,
        ...(filters as Partial<LeadsListFilters>),
      };
  const qs = buildLeadsListSearchParams(parsed);
  return qs ? `/leads?${qs}` : "/leads";
}

export function buildLeadDetailHref(leadId: string, listFilters: Partial<LeadsListFilters> | SearchInput): string {
  const qs = buildLeadsListSearchParams(
    listFilters instanceof URLSearchParams || !("q" in (listFilters as object))
      ? parseLeadsListFilters(listFilters as SearchInput)
      : (listFilters as Partial<LeadsListFilters>),
  );
  const base = `/leads/${encodeURIComponent(leadId)}`;
  return qs ? `${base}?${qs}` : base;
}

export function hasActiveLeadsListFilters(filters: LeadsListFilters): boolean {
  return Boolean(filters.q || filters.status || filters.prefecture || filters.tag);
}
