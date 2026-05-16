import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerDetailClient } from "../../components/CustomerDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.customer.findUnique({
    where: { id },
    select: { destination: true },
  });
  return {
    title: row ? `${row.destination} | 顧客` : "顧客 | Nectere",
    description: "顧客の詳細・編集",
  };
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.customer.findUnique({
    where: { id },
    include: { tags: { orderBy: { name: "asc" }, select: { id: true, name: true, color: true } } },
  });
  if (!row) notFound();
  return <CustomerDetailClient initialCustomer={JSON.parse(JSON.stringify(row))} />;
}
