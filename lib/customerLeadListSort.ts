import { getLastActionFromLogs } from "@/lib/customers";

export type ListSortPreset =
  | "updated_desc"
  | "updated_asc"
  | "created_desc"
  | "created_asc"
  | "lastAction_desc"
  | "lastAction_asc"
  | "destination_asc"
  | "destination_desc";

export type ListSortableRow = {
  id: string;
  destination: string;
  actionLogs: unknown;
  createdAt: string;
  updatedAt: string;
};

export const LIST_SORT_PRESET_OPTIONS: { value: ListSortPreset; label: string }[] = [
  { value: "updated_desc", label: "更新日（新しい順）" },
  { value: "updated_asc", label: "更新日（古い順）" },
  { value: "lastAction_desc", label: "最終アクション（新しい順）" },
  { value: "lastAction_asc", label: "最終アクション（古い順）" },
  { value: "created_desc", label: "登録日（新しい順）" },
  { value: "created_asc", label: "登録日（古い順）" },
  { value: "destination_asc", label: "電話先（あいうえお順）" },
  { value: "destination_desc", label: "電話先（逆順）" },
];

function timeMs(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** アクション日が取れない行は常に末尾（新しい順・古い順どちらでも） */
function lastActionTimeMs(raw: unknown): number | null {
  const last = getLastActionFromLogs(raw);
  if (!last) return null;
  const t = new Date(last.date).getTime();
  return Number.isNaN(t) ? null : t;
}

export function sortRowsByPreset<T extends ListSortableRow>(rows: T[], preset: ListSortPreset): T[] {
  const out = [...rows];
  const cmpId = (a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  out.sort((a, b) => {
    let c = 0;
    switch (preset) {
      case "updated_desc":
        c = timeMs(b.updatedAt) - timeMs(a.updatedAt);
        break;
      case "updated_asc":
        c = timeMs(a.updatedAt) - timeMs(b.updatedAt);
        break;
      case "created_desc":
        c = timeMs(b.createdAt) - timeMs(a.createdAt);
        break;
      case "created_asc":
        c = timeMs(a.createdAt) - timeMs(b.createdAt);
        break;
      case "lastAction_desc": {
        const ta = lastActionTimeMs(a.actionLogs);
        const tb = lastActionTimeMs(b.actionLogs);
        if (ta == null && tb == null) c = 0;
        else if (ta == null) c = 1;
        else if (tb == null) c = -1;
        else c = tb - ta;
        break;
      }
      case "lastAction_asc": {
        const ta = lastActionTimeMs(a.actionLogs);
        const tb = lastActionTimeMs(b.actionLogs);
        if (ta == null && tb == null) c = 0;
        else if (ta == null) c = 1;
        else if (tb == null) c = -1;
        else c = ta - tb;
        break;
      }
      case "destination_asc":
        c = a.destination.localeCompare(b.destination, "ja");
        break;
      case "destination_desc":
        c = b.destination.localeCompare(a.destination, "ja");
        break;
      default:
        c = 0;
    }
    if (c !== 0) return c;
    return cmpId(a, b);
  });
  return out;
}
