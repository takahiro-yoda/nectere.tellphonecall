import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const list = await prisma.callType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const maxOrder = await prisma.callType.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.callType.create({
    data: {
      name,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      isActive: body?.isActive !== false,
    },
  });
  return NextResponse.json(created);
}
