export type ScriptFlowStep = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string | null;
  choiceKey: string;
  choiceLabel: string | null;
  at: string;
};

export type ScriptFlowData = {
  version: 1;
  callTypeId: string;
  nodePath: string[];
  steps: ScriptFlowStep[];
};

const FLOW_PREFIX = "<!--NECTERE_FLOW:";
const FLOW_SUFFIX = "-->";

function toBase64(input: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(input)));
}

function fromBase64(input: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(input)));
}

function isScriptFlowData(value: unknown): value is ScriptFlowData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Partial<ScriptFlowData>;
  return (
    obj.version === 1 &&
    typeof obj.callTypeId === "string" &&
    Array.isArray(obj.nodePath) &&
    Array.isArray(obj.steps)
  );
}

export function parseCallMemo(rawMemo: string | null | undefined): {
  memoText: string | null;
  scriptFlow: ScriptFlowData | null;
} {
  if (!rawMemo) return { memoText: null, scriptFlow: null };
  const start = rawMemo.indexOf(FLOW_PREFIX);
  if (start === -1) return { memoText: rawMemo, scriptFlow: null };
  const end = rawMemo.indexOf(FLOW_SUFFIX, start + FLOW_PREFIX.length);
  if (end === -1) return { memoText: rawMemo, scriptFlow: null };

  const encoded = rawMemo.slice(start + FLOW_PREFIX.length, end).trim();
  const memoText = rawMemo.slice(0, start).trim() || null;
  if (!encoded) return { memoText, scriptFlow: null };

  try {
    const decoded = fromBase64(encoded);
    const parsed = JSON.parse(decoded);
    if (!isScriptFlowData(parsed)) return { memoText, scriptFlow: null };
    return { memoText, scriptFlow: parsed };
  } catch {
    return { memoText, scriptFlow: null };
  }
}

export function serializeCallMemo(input: {
  memoText?: string | null;
  scriptFlow?: ScriptFlowData | null;
}): string | null {
  const memoText = input.memoText?.trim() || null;
  const flow = input.scriptFlow ?? null;
  if (!flow) return memoText;
  const encoded = toBase64(JSON.stringify(flow));
  if (!memoText) return `${FLOW_PREFIX}${encoded}${FLOW_SUFFIX}`;
  return `${memoText}\n\n${FLOW_PREFIX}${encoded}${FLOW_SUFFIX}`;
}
