import { prisma } from "@/lib/db";

type CallLike = {
  id: string;
  createdAt: Date;
};

function formatYYMM(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

function monthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function buildCallCodeMap(calls: CallLike[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (calls.length === 0) return result;

  const monthKeys = Array.from(new Set(calls.map((call) => formatYYMM(call.createdAt))));
  for (const monthKey of monthKeys) {
    const yy = Number(`20${monthKey.slice(0, 2)}`);
    const mm = Number(monthKey.slice(2, 4));
    const baseDate = new Date(yy, mm - 1, 1);
    const range = monthRange(baseDate);
    const monthlyCalls = await prisma.call.findMany({
      where: {
        createdAt: {
          gte: range.start,
          lte: range.end,
        },
      },
      select: { id: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    monthlyCalls.forEach((call, index) => {
      const sequence = String(index + 1).padStart(4, "0");
      result.set(call.id, `${monthKey}${sequence}`);
    });
  }
  return result;
}
