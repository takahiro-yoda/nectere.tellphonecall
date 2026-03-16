import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await _request.json();
  const { destination, memo, assigneeId, isAppointment } = body;

  const data: {
    destination?: string;
    memo?: string | null;
    assigneeId?: string | null;
    isAppointment?: boolean;
  } = {};
  if (typeof destination === "string" && destination.trim() !== "")
    data.destination = destination.trim();
  if (memo !== undefined) data.memo = memo != null ? String(memo).trim() || null : null;
  if (assigneeId !== undefined) data.assigneeId = assigneeId == null || assigneeId === "" ? null : assigneeId;
  if (typeof isAppointment === "boolean") data.isAppointment = isAppointment;

  const updated = await prisma.call.update({
    where: { id },
    data,
    include: { assignee: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.call.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
