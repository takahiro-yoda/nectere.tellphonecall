import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { digitsOnlyPhone } from "@/lib/customers";
import { parseUrlsFromRequestBody } from "@/lib/extraUrls";
import { normalizeEmailInput, normalizePrefectureInput } from "@/lib/japanPrefectures";
import { parseLeadStatus } from "@/lib/leadStatus";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const statusParam = request.nextUrl.searchParams.get("status")?.trim() ?? "";
  const status = parseLeadStatus(statusParam);

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
  const where: Prisma.LeadWhereInput = {
    ...(q ? { OR: orClause } : {}),
    ...(status ? { status } : {}),
    ...(prefecture !== "" ? { prefecture } : {}),
  };

  const items = await prisma.lead.findMany({
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
    status: statusRaw,
    urls: urlsRaw,
  } = body as Record<string, unknown>;

  if (typeof destination !== "string" || destination.trim() === "") {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }

  const status = parseLeadStatus(typeof statusRaw === "string" ? statusRaw : "") ?? "RESEARCHING";

  const phoneDigits =
    typeof destinationPhone === "string" && destinationPhone.trim() !== ""
      ? digitsOnlyPhone(destinationPhone)
      : null;

  try {
    const created = await prisma.lead.create({
      data: {
        destination: destination.trim(),
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
        status,
        actionLogs: [] as Prisma.InputJsonValue,
        urls: (parseUrlsFromRequestBody(urlsRaw) ?? []) as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json(created);
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("Failed to create lead", e);
    return NextResponse.json({ error: "作成に失敗しました", detail }, { status: 500 });
  }
}
