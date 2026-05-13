import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildCustomerMatchKey,
  createManualActionLogEntry,
  parseCustomerActionLogs,
} from "@/lib/customers";
import { parseRecordUrls } from "@/lib/extraUrls";
import { leadStatusLabel } from "@/lib/leadStatus";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id } });
      if (!lead) return { ok: false, reason: "NOT_FOUND" } as const;

      const matchKey = buildCustomerMatchKey(lead.destination, lead.destinationPhone);
      const existing = await tx.customer.findUnique({ where: { matchKey } });
      if (existing) {
        return { ok: false, reason: "CONFLICT", existingId: existing.id } as const;
      }

      const prevLogs = parseCustomerActionLogs(lead.actionLogs);
      const migrateEntry = createManualActionLogEntry(
        new Date().toISOString(),
        "営業先リストから顧客へ移行",
        `リードステータス: ${leadStatusLabel(lead.status)}（元リードID: ${lead.id}）`,
      );
      const logs = [...prevLogs, migrateEntry].slice(-200);

      const leadUrls = parseRecordUrls((lead as { urls?: unknown }).urls);

      const created = await tx.customer.create({
        data: {
          matchKey,
          destination: lead.destination,
          destinationContactName: lead.destinationContactName,
          destinationContactKana: lead.destinationContactKana,
          destinationPhone: lead.destinationPhone,
          prefecture: lead.prefecture,
          addressLine: lead.addressLine,
          email: lead.email,
          memo: lead.memo,
          urls: leadUrls as Prisma.InputJsonValue,
          actionLogs: logs as Prisma.InputJsonValue,
        },
      });

      await tx.call.updateMany({
        where: { leadId: id },
        data: { customerId: created.id, leadId: null },
      });

      await tx.lead.delete({ where: { id } });
      return { ok: true, customerId: created.id } as const;
    });

    if (!result.ok && result.reason === "NOT_FOUND") {
      return NextResponse.json({ error: "リードが見つかりません" }, { status: 404 });
    }
    if (!result.ok && result.reason === "CONFLICT") {
      return NextResponse.json(
        {
          error: "同じ電話先／電話番号の顧客が既に存在します。既存顧客に手動で反映するか、電話先を変えてください。",
          existingCustomerId: result.existingId,
        },
        { status: 409 },
      );
    }
    if (result.ok) {
      return NextResponse.json({ customerId: result.customerId });
    }
    return NextResponse.json({ error: "移行に失敗しました" }, { status: 500 });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("convert lead to customer", e);
    return NextResponse.json({ error: "移行に失敗しました", detail }, { status: 500 });
  }
}
