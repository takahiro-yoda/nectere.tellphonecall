import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomersHome } from "../components/CustomersHome";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "顧客 | Nectere",
  description: "顧客リスト・架電と連携したアクションログ",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; selected?: string; prefecture?: string }>;
}) {
  const sp = await searchParams;
  const legacySelected = sp.selected?.trim();
  if (legacySelected) {
    redirect(`/customers/${legacySelected}`);
  }
  const q = (sp.q ?? "").trim();
  const prefecture = (sp.prefecture ?? "").trim();

  const qDigits = q.replace(/\D/g, "");
  const orClause: Prisma.CustomerWhereInput[] = [
    { destination: { contains: q, mode: "insensitive" } },
    { destinationContactName: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { addressLine: { contains: q, mode: "insensitive" } },
  ];
  if (qDigits.length >= 2) {
    orClause.push({ destinationPhone: { contains: qDigits } });
  }

  const and: Prisma.CustomerWhereInput[] = [];
  if (q) and.push({ OR: orClause });
  if (prefecture) and.push({ prefecture });
  const where: Prisma.CustomerWhereInput = and.length > 0 ? { AND: and } : {};

  const rows = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 400,
  });

  return (
    <CustomersHome
      initialCustomers={JSON.parse(JSON.stringify(rows))}
      initialQ={q}
      initialPrefecture={prefecture}
    />
  );
}
