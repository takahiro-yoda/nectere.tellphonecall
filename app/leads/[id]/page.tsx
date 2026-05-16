import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildLeadsListHref } from "@/lib/leadsListParams";
import { LeadDetailClient } from "../../components/LeadDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.lead.findUnique({
    where: { id },
    select: { destination: true },
  });
  return {
    title: row ? `${row.destination} | 営業先` : "営業先 | Nectere",
    description: "営業先リードの詳細・編集",
  };
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const row = await prisma.lead.findUnique({
    where: { id },
    include: { tags: { orderBy: { name: "asc" }, select: { id: true, name: true, color: true } } },
  });
  if (!row) notFound();
  return (
    <LeadDetailClient
      initialLead={JSON.parse(JSON.stringify(row))}
      listReturnHref={buildLeadsListHref(sp)}
    />
  );
}
