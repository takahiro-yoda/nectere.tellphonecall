import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  const maxOrder = await prisma.pricingSegment.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const segment = await prisma.pricingSegment.create({
    data: { sortOrder },
  });

  const courses = await prisma.pricingCourse.findMany({ select: { id: true } });
  if (courses.length > 0) {
    await prisma.pricingPriceCell.createMany({
      data: courses.map((c) => ({
        segmentId: segment.id,
        courseId: c.id,
        priceYen: null,
      })),
    });
  }

  return NextResponse.json(segment);
}
