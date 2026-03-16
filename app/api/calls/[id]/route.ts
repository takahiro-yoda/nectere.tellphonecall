import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await _request.json();
  const { destination, memo, assigneeId, isAppointment, status, createdAt } = body;

  const data: {
    destination?: string;
    memo?: string | null;
    assignee?:
      | {
          connect: { id: string };
        }
      | {
          disconnect: true;
        };
    isAppointment?: boolean;
    status?: "APPOINTMENT" | "NO_ANSWER" | "OTHER";
    createdAt?: Date;
  } = {};
  if (typeof destination === "string" && destination.trim() !== "")
    data.destination = destination.trim();
  if (memo !== undefined) data.memo = memo != null ? String(memo).trim() || null : null;
  if (assigneeId !== undefined) {
    data.assignee =
      assigneeId == null || assigneeId === ""
        ? { disconnect: true }
        : {
            connect: { id: assigneeId },
          };
  }
  if (typeof isAppointment === "boolean") data.isAppointment = isAppointment;
  if (status === "APPOINTMENT" || status === "NO_ANSWER" || status === "OTHER") data.status = status;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      data.createdAt = d;
    }
  }

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
