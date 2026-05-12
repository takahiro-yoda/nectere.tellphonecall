import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildCustomerMatchKey, digitsOnlyPhone } from "@/lib/customers";
import { normalizeEmailInput, normalizePrefectureInput } from "@/lib/japanPrefectures";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
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
  const prefecture = request.nextUrl.searchParams.get("prefecture")?.trim() ?? "";
  const and: Prisma.CustomerWhereInput[] = [];
  if (q) and.push({ OR: orClause });
  if (prefecture) and.push({ prefecture });
  const where: Prisma.CustomerWhereInput = and.length > 0 ? { AND: and } : {};

  const items = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 400,
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    destination,
    destinationContactName,
    destinationContactKana,
    destinationPhone,
    memo,
    prefecture,
    addressLine,
    email,
  } = body as Record<string, unknown>;

  if (typeof destination !== "string" || destination.trim() === "") {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }

  const dest = destination.trim();
  const phoneDigits =
    typeof destinationPhone === "string" && destinationPhone.trim() !== ""
      ? digitsOnlyPhone(destinationPhone)
      : null;
  const matchKey = buildCustomerMatchKey(dest, phoneDigits);

  const clash = await prisma.customer.findUnique({ where: { matchKey } });
  if (clash) {
    return NextResponse.json(
      { error: "同じ電話番号または電話先名の顧客が既に存在します" },
      { status: 409 },
    );
  }

  try {
    const created = await prisma.customer.create({
      data: {
        matchKey,
        destination: dest,
        destinationContactName:
          typeof destinationContactName === "string" && destinationContactName.trim() !== ""
            ? destinationContactName.trim()
            : null,
        destinationContactKana:
          typeof destinationContactKana === "string" && destinationContactKana.trim() !== ""
            ? destinationContactKana.trim()
            : null,
        destinationPhone: phoneDigits,
        memo: typeof memo === "string" && memo.trim() !== "" ? memo.trim() : null,
        prefecture: typeof prefecture === "string" ? normalizePrefectureInput(prefecture) : null,
        addressLine: typeof addressLine === "string" && addressLine.trim() !== "" ? addressLine.trim() : null,
        email: typeof email === "string" ? normalizeEmailInput(email) : null,
        actionLogs: [] as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json(created);
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("Failed to create customer", e);
    return NextResponse.json({ error: "作成に失敗しました", detail }, { status: 500 });
  }
}
