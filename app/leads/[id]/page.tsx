import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.lead.findUnique({ where: { id } });
  if (!row) notFound();
  return <LeadDetailClient initialLead={JSON.parse(JSON.stringify(row))} />;
}
