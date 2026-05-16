import type { PrismaClient } from "@prisma/client";
import { buildCustomerMatchKey, digitsOnlyPhone } from "@/lib/customers";

export type CallProfileLink = {
  type: "customer" | "lead";
  id: string;
  href: string;
  /** 表示用（例: 株式会社〇〇） */
  destination: string;
};

type CallLike = {
  customerId: string | null;
  leadId: string | null;
  destination: string;
  destinationPhone: string | null;
};

export function profileLinkFromCallIds(call: {
  customerId?: string | null;
  leadId?: string | null;
  destination?: string;
}): CallProfileLink | null {
  const dest = (call.destination ?? "").trim() || "—";
  const cid = call.customerId?.trim();
  if (cid) {
    return { type: "customer", id: cid, href: `/customers/${encodeURIComponent(cid)}`, destination: dest };
  }
  const lid = call.leadId?.trim();
  if (lid) {
    return { type: "lead", id: lid, href: `/leads/${encodeURIComponent(lid)}`, destination: dest };
  }
  return null;
}

export async function resolveCallProfile(
  prisma: PrismaClient,
  call: CallLike,
): Promise<CallProfileLink | null> {
  const direct = profileLinkFromCallIds(call);
  if (direct) {
    if (direct.type === "customer") {
      const row = await prisma.customer.findUnique({
        where: { id: direct.id },
        select: { destination: true },
      });
      if (row) return { ...direct, destination: row.destination };
    } else {
      const row = await prisma.lead.findUnique({
        where: { id: direct.id },
        select: { destination: true },
      });
      if (row) return { ...direct, destination: row.destination };
    }
    return null;
  }

  const matchKey = buildCustomerMatchKey(call.destination, call.destinationPhone);
  const customer = await prisma.customer.findUnique({
    where: { matchKey },
    select: { id: true, destination: true },
  });
  if (customer) {
    return {
      type: "customer",
      id: customer.id,
      href: `/customers/${encodeURIComponent(customer.id)}`,
      destination: customer.destination,
    };
  }

  const phoneDigits = digitsOnlyPhone(call.destinationPhone);
  const destNorm = call.destination.trim();
  if (!phoneDigits && !destNorm) return null;

  const or: { destinationPhone?: string; destination?: { equals: string; mode: "insensitive" } }[] = [];
  if (phoneDigits) or.push({ destinationPhone: phoneDigits });
  if (destNorm) or.push({ destination: { equals: destNorm, mode: "insensitive" } });

  const lead = await prisma.lead.findFirst({
    where: { OR: or },
    orderBy: { updatedAt: "desc" },
    select: { id: true, destination: true },
  });
  if (lead) {
    return {
      type: "lead",
      id: lead.id,
      href: `/leads/${encodeURIComponent(lead.id)}`,
      destination: lead.destination,
    };
  }

  return null;
}

export function callProfileLinkLabel(type: CallProfileLink["type"]): string {
  return type === "customer" ? "顧客プロフィール" : "営業先プロフィール";
}
