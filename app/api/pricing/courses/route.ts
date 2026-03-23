import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function nonNegInt(v: unknown): v is number {
  return typeof v === "number" && v >= 0 && Number.isInteger(v);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const maxOrder = await prisma.pricingCourse.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const name =
    typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : "新しいプラン";
  const revenuePerContractYen = nonNegInt(body.revenuePerContractYen) ? body.revenuePerContractYen : 0;
  const variableCostPerContractYen = nonNegInt(body.variableCostPerContractYen)
    ? body.variableCostPerContractYen
    : 0;

  const course = await prisma.pricingCourse.create({
    data: {
      sortOrder,
      name,
      revenuePerContractYen,
      variableCostPerContractYen,
    },
  });

  return NextResponse.json(course);
}
