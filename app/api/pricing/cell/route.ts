import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { segmentId, courseId, priceYen } = body;

  if (typeof segmentId !== "string" || typeof courseId !== "string") {
    return NextResponse.json({ error: "segmentId and courseId required" }, { status: 400 });
  }

  let value: number | null;
  if (priceYen === null || priceYen === "" || priceYen === undefined) {
    value = null;
  } else if (typeof priceYen === "number" && Number.isInteger(priceYen) && priceYen >= 0) {
    value = priceYen;
  } else {
    return NextResponse.json({ error: "Invalid priceYen" }, { status: 400 });
  }

  const cell = await prisma.pricingPriceCell.upsert({
    where: {
      segmentId_courseId: { segmentId, courseId },
    },
    create: { segmentId, courseId, priceYen: value },
    update: { priceYen: value },
  });

  return NextResponse.json(cell);
}
