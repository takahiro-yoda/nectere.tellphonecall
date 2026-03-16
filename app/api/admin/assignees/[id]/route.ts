import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await _request.json();
  const { name, color, sortOrder } = body;

  const data: { name?: string; color?: string | null; sortOrder?: number } = {};
  if (typeof name === "string") data.name = name.trim();
  if (color !== undefined) data.color = color != null ? String(color).trim() || null : null;
  if (typeof sortOrder === "number") data.sortOrder = sortOrder;

  const updated = await prisma.assignee.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.assignee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
