import type { PrismaClient } from "@prisma/client";
import { isValidRecordTagName, normalizeRecordTagName } from "@/lib/recordTags";

export type RecordTagRow = { id: string; name: string; color: string | null };

type TagDelegate = {
  findUnique: (args: { where: { id: string }; select: { id: true } }) => Promise<{ id: string } | null>;
  upsert: (args: {
    where: { name: string };
    create: { name: string };
    update: Record<string, never>;
    select: { id: true };
  }) => Promise<{ id: string }>;
};

export async function resolveTagId(
  tagDelegate: TagDelegate,
  tagIdRaw: string,
  tagNameRaw: string,
): Promise<{ tagId: string } | { error: string; status: number }> {
  const normalizedName = normalizeRecordTagName(tagNameRaw);
  if (normalizedName.length > 0) {
    if (!isValidRecordTagName(normalizedName)) {
      return { error: "タグ名が不正です", status: 400 };
    }
    const tag = await tagDelegate.upsert({
      where: { name: normalizedName },
      create: { name: normalizedName },
      update: {},
      select: { id: true },
    });
    return { tagId: tag.id };
  }
  const tagId = tagIdRaw.trim();
  if (!tagId) {
    return { error: "tagId または tagName のどちらかが必要です", status: 400 };
  }
  const tag = await tagDelegate.findUnique({ where: { id: tagId }, select: { id: true } });
  if (!tag) {
    return { error: "タグが見つかりません", status: 404 };
  }
  return { tagId: tag.id };
}

export async function fetchLeadTags(prisma: PrismaClient, leadId: string): Promise<RecordTagRow[]> {
  const row = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { tags: { orderBy: { name: "asc" }, select: { id: true, name: true, color: true } } },
  });
  return row?.tags ?? [];
}

export async function fetchCustomerTags(prisma: PrismaClient, customerId: string): Promise<RecordTagRow[]> {
  const row = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { tags: { orderBy: { name: "asc" }, select: { id: true, name: true, color: true } } },
  });
  return row?.tags ?? [];
}

export async function fetchKpiDefinitionTags(
  prisma: PrismaClient,
  kpiDefinitionId: string,
): Promise<RecordTagRow[]> {
  const row = await prisma.kpiDefinition.findUnique({
    where: { id: kpiDefinitionId },
    select: { tags: { orderBy: { name: "asc" }, select: { id: true, name: true, color: true } } },
  });
  return row?.tags ?? [];
}
