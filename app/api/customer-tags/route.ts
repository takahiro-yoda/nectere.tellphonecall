import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidRecordTagName, normalizeRecordTagName } from "@/lib/recordTags";

export async function GET() {
  const items = await prisma.customerTag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const nameRaw = typeof body.name === "string" ? body.name : "";
  const name = normalizeRecordTagName(nameRaw);
  if (!isValidRecordTagName(name)) {
    return NextResponse.json({ error: "タグ名が不正です" }, { status: 400 });
  }
  try {
    const created = await prisma.customerTag.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json(created);
  } catch (e: unknown) {
    console.error("customer-tags POST", e);
    return NextResponse.json({ error: "タグの作成に失敗しました" }, { status: 500 });
  }
}
