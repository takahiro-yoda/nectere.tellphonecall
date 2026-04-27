import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCallMemo } from "@/lib/callFlow";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const mode = searchParams.get("mode") ?? "quick";

  if (mode !== "full" && q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  if (mode === "full") {
    const calls = await prisma.call.findMany({
      where: {
        OR: [
          { destination: { contains: q } },
          { destinationContactName: { contains: q } },
          { destinationPhone: { contains: q } },
          { memo: { contains: q } },
          { assignee: { is: { name: { contains: q } } } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 200,
      select: {
        id: true,
        destination: true,
        destinationContactName: true,
        destinationContactKana: true,
        destinationPhone: true,
        memo: true,
        assignee: { select: { id: true, name: true, color: true } },
        callTypeId: true,
        callType: { select: { id: true, name: true } },
        isAppointment: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      items: calls.map((call) => {
        const parsed = parseCallMemo(call.memo);
        return { ...call, memo: parsed.memoText };
      }),
    });
  }

  const calls = await prisma.call.findMany({
    where: {
      OR: [
        { destination: { contains: q } },
        { destinationContactName: { contains: q } },
        { destinationPhone: { contains: q } },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 10,
    select: {
      id: true,
      destination: true,
      destinationContactName: true,
      destinationContactKana: true,
      destinationPhone: true,
      callTypeId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ items: calls });
}
