import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMonthPeriod } from "@/lib/dateUtils";

const PERIOD_RE = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("period");
  const period = q && PERIOD_RE.test(q) ? q : getMonthPeriod(new Date());
  const rows = await prisma.contractPlanTarget.findMany({ where: { period } });
  return NextResponse.json({
    period,
    targets: rows.map((r) => ({ courseId: r.courseId, targetCount: r.targetCount })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { period, targets } = body;

  if (typeof period !== "string" || !PERIOD_RE.test(period)) {
    return NextResponse.json({ error: "period must be YYYY-MM" }, { status: 400 });
  }
  if (!Array.isArray(targets)) {
    return NextResponse.json({ error: "targets must be an array" }, { status: 400 });
  }

  for (const t of targets) {
    if (typeof t !== "object" || t === null) {
      return NextResponse.json({ error: "invalid target entry" }, { status: 400 });
    }
    if (typeof t.courseId !== "string" || typeof t.targetCount !== "number") {
      return NextResponse.json({ error: "each target needs courseId and targetCount" }, { status: 400 });
    }
    if (t.targetCount < 0 || !Number.isInteger(t.targetCount)) {
      return NextResponse.json({ error: "targetCount must be a non-negative integer" }, { status: 400 });
    }
  }

  const courseIds = [...new Set(targets.map((t: { courseId: string }) => t.courseId))];
  const existing = await prisma.pricingCourse.findMany({
    where: { id: { in: courseIds } },
    select: { id: true },
  });
  if (existing.length !== courseIds.length) {
    return NextResponse.json({ error: "unknown courseId" }, { status: 400 });
  }

  await prisma.$transaction(
    targets.map((t: { courseId: string; targetCount: number }) =>
      prisma.contractPlanTarget.upsert({
        where: { courseId_period: { courseId: t.courseId, period } },
        create: { courseId: t.courseId, period, targetCount: t.targetCount },
        update: { targetCount: t.targetCount },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
