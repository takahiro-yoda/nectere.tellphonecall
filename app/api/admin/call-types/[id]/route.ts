import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: { name?: string; isActive?: boolean; sortOrder?: number } = {};
  if (typeof body?.name === "string" && body.name.trim() !== "") data.name = body.name.trim();
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;

  const updated = await prisma.callType.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.callType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
