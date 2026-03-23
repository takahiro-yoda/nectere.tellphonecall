import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = Math.min(200, Math.max(1, limitParam ? parseInt(limitParam, 10) || 50 : 50));

  const contracts = await prisma.contract.findMany({
    orderBy: { signedAt: "desc" },
    take: limit,
  });
  return NextResponse.json(contracts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { signedAt, memo } = body;

  let signed: Date | undefined;
  if (signedAt != null && signedAt !== "") {
    const d = new Date(signedAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid signedAt" }, { status: 400 });
    }
    signed = d;
  }

  const created = await prisma.contract.create({
    data: {
      signedAt: signed,
      memo: memo != null && String(memo).trim() !== "" ? String(memo).trim() : null,
    },
  });
  return NextResponse.json(created);
}
