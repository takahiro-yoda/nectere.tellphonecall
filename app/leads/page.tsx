import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { LeadsHome } from "../components/LeadsHome";
import { parseLeadStatus } from "@/lib/leadStatus";
import { parseLeadsListFilters } from "@/lib/leadsListParams";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "営業先リスト | Nectere",
  description: "リード管理・架電記録へ連携",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    selected?: string;
    prefecture?: string;
    tag?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const legacySelected = sp.selected?.trim();
  if (legacySelected) {
    redirect(`/leads/${legacySelected}`);
  }
  const filters = parseLeadsListFilters(sp);
  const q = filters.q;
  const statusFilter = parseLeadStatus(filters.status);
  const prefecture = filters.prefecture;
  const tagId = filters.tag;

  const qDigits = q.replace(/\D/g, "");
  const orClause: Prisma.LeadWhereInput[] = [
    { destination: { contains: q, mode: "insensitive" } },
    { destinationContactName: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { addressLine: { contains: q, mode: "insensitive" } },
    { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
  ];
  if (qDigits.length >= 2) {
    orClause.push({ destinationPhone: { contains: qDigits } });
  }

  const and: Prisma.LeadWhereInput[] = [];
  if (q) and.push({ OR: orClause });
  if (statusFilter) and.push({ status: statusFilter });
  if (prefecture) and.push({ prefecture });
  if (tagId) and.push({ tags: { some: { id: tagId } } });
  const where: Prisma.LeadWhereInput = and.length > 0 ? { AND: and } : {};

  const [rows, allTags] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 400,
      include: {
        tags: { orderBy: { name: "asc" }, select: { id: true, name: true, color: true } },
      },
    }),
    prisma.leadTag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const serialized = {
    initialLeads: JSON.parse(JSON.stringify(rows)),
    initialQ: q,
    initialStatus: statusFilter ?? "",
    initialPrefecture: prefecture,
    initialTagFilter: tagId,
    initialSort: filters.sort,
    initialAllTags: JSON.parse(JSON.stringify(allTags)),
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 p-8 text-sm text-zinc-500">読み込み中…</div>
      }
    >
      <LeadsHome {...serialized} />
    </Suspense>
  );
}
