import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ items: [] });
  }
  const qDigits = q.replace(/\D/g, "");
  const orClause: object[] = [
    { destination: { contains: q, mode: "insensitive" } },
    { destinationContactName: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { addressLine: { contains: q, mode: "insensitive" } },
  ];
  if (qDigits.length >= 2) {
    orClause.push({ destinationPhone: { contains: qDigits } });
  }

  const items = await prisma.customer.findMany({
    where: { OR: orClause },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      id: true,
      destination: true,
      destinationContactName: true,
      destinationContactKana: true,
      destinationPhone: true,
    },
  });
  return NextResponse.json({ items });
}
