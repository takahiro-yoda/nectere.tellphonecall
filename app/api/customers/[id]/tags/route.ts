import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchCustomerTags, resolveTagId } from "@/lib/recordTagMutations";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = await params;
  const existing = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const resolved = await resolveTagId(
    prisma.customerTag,
    typeof body.tagId === "string" ? body.tagId : "",
    typeof body.tagName === "string" ? body.tagName : "",
  );
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { tags: { connect: { id: resolved.tagId } } },
    });
    const tags = await fetchCustomerTags(prisma, customerId);
    return NextResponse.json({ tags });
  } catch (e: unknown) {
    console.error("customer tag POST", e);
    return NextResponse.json({ error: "タグの追加に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = await params;
  const existing = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tagId = typeof body.tagId === "string" ? body.tagId.trim() : "";
  if (!tagId) {
    return NextResponse.json({ error: "tagId が必要です" }, { status: 400 });
  }

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { tags: { disconnect: { id: tagId } } },
    });
    const tags = await fetchCustomerTags(prisma, customerId);
    return NextResponse.json({ tags });
  } catch (e: unknown) {
    console.error("customer tag DELETE", e);
    return NextResponse.json({ error: "タグの削除に失敗しました" }, { status: 500 });
  }
}
