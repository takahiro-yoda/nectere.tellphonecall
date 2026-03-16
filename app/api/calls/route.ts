import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRangeForView, parseCustomDateRange, type ViewPeriod } from "@/lib/dateUtils";

const RANGE_MAP: Record<string, ViewPeriod> = {
  week: "this-week",
  "last-week": "last-week",
  month: "this-month",
  "last-month": "last-month",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let start: Date;
  let end: Date;

  if (rangeParam === "custom" && fromParam != null && toParam != null) {
    const range = parseCustomDateRange(fromParam, toParam);
    if (!range) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    start = range.start;
    end = range.end;
  } else {
    const view = rangeParam ? RANGE_MAP[rangeParam] : null;
    if (!view) return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    const r = getRangeForView(view);
    start = r.start;
    end = r.end;
  }

  const calls = await prisma.call.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "desc" },
    include: { assignee: true },
  });
  return NextResponse.json(calls);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { destination, memo, createdAt, assigneeId, isAppointment, status } = body;

  if (!destination || typeof destination !== "string" || destination.trim() === "") {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }

  try {
    const created = await prisma.call.create({
      data: {
        destination: destination.trim(),
        memo: memo != null ? String(memo).trim() || null : null,
        assignee:
          assigneeId == null || assigneeId === ""
            ? undefined
            : {
                connect: { id: assigneeId },
              },
        isAppointment: Boolean(isAppointment),
        status:
          status === "APPOINTMENT" || status === "NO_ANSWER" || status === "OTHER"
            ? status
            : Boolean(isAppointment)
              ? "APPOINTMENT"
              : "OTHER",
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
      include: { assignee: true },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    console.error("Failed to create call", e);
    return NextResponse.json(
      {
        error: "サーバー内部エラーです。管理者にお問い合わせください。",
        detail: e?.message ?? String(e),
      },
      { status: 500 },
    );
  }
}
