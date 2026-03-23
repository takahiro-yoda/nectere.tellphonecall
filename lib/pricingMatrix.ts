import { prisma } from "@/lib/db";

export type PricingCourseRow = {
  id: string;
  name: string;
  sortOrder: number;
  revenuePerContractYen: number;
  variableCostPerContractYen: number;
};

export type PricingMatrixPayload = {
  segments: { id: string; name: string; sortOrder: number }[];
  courses: PricingCourseRow[];
  cells: { segmentId: string; courseId: string; priceYen: number | null }[];
};

export async function getPricingMatrix(): Promise<PricingMatrixPayload> {
  const [segments, courses, cellRows] = await Promise.all([
    prisma.pricingSegment.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.pricingCourse.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.pricingPriceCell.findMany({
      select: { segmentId: true, courseId: true, priceYen: true },
    }),
  ]);

  return {
    segments: segments.map((s) => ({ id: s.id, name: s.name, sortOrder: s.sortOrder })),
    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      revenuePerContractYen: c.revenuePerContractYen,
      variableCostPerContractYen: c.variableCostPerContractYen,
    })),
    cells: cellRows.map((c) => ({
      segmentId: c.segmentId,
      courseId: c.courseId,
      priceYen: c.priceYen,
    })),
  };
}

export function cellPrice(
  cells: PricingMatrixPayload["cells"],
  segmentId: string,
  courseId: string,
): number | null {
  const hit = cells.find((x) => x.segmentId === segmentId && x.courseId === courseId);
  return hit ? hit.priceYen : null;
}

/** 旧区分マトリクスからの代表単価（移行用） */
export function averagePriceYenPerCourse(payload: PricingMatrixPayload, courseId: string): number | null {
  const prices: number[] = [];
  for (const s of payload.segments) {
    const p = cellPrice(payload.cells, s.id, courseId);
    if (p != null) prices.push(p);
  }
  if (prices.length === 0) return null;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

/** 試算用の売上単価（プラン設定を優先、なければ旧マスの平均） */
export function effectiveRevenueYenPerCourse(
  payload: PricingMatrixPayload,
  courseId: string,
): number | null {
  const c = payload.courses.find((x) => x.id === courseId);
  if (!c) return null;
  if (c.revenuePerContractYen > 0) return c.revenuePerContractYen;
  return averagePriceYenPerCourse(payload, courseId);
}

export function effectiveVariableCostPerContractYen(planVariable: number, globalVariable: number): number {
  return planVariable > 0 ? planVariable : globalVariable;
}
