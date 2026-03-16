import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const list = await prisma.assignee.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, color } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const maxOrder = await prisma.assignee.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.assignee.create({
    data: {
      name: name.trim(),
      color: color != null ? String(color).trim() || null : null,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json(created);
}
