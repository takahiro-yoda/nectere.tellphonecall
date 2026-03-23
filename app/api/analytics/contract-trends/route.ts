import { NextRequest, NextResponse } from "next/server";
import { getSalesConfig } from "@/lib/contracts";
import { getAnnualSummaries, getMonthTrendRowsForYear } from "@/lib/contractAnalytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseYear(v: string | null, fallback: number) {
  if (!v) return fallback;
  const y = parseInt(v, 10);
  if (!Number.isFinite(y) || y < 2000 || y > 2100) return fallback;
  return y;
}

export async function GET(req: NextRequest) {
  const now = new Date();
  const defaultY = now.getFullYear();
  const year = parseYear(req.nextUrl.searchParams.get("year"), defaultY);
  const spanRaw = req.nextUrl.searchParams.get("annualSpan");
  const annualSpan = Math.min(12, Math.max(2, parseInt(spanRaw ?? "5", 10) || 5));

  const sales = await getSalesConfig();
  const salesLike = {
    defaultRevenuePerContractYen: sales.defaultRevenuePerContractYen,
    monthlyFixedExpenseYen: sales.monthlyFixedExpenseYen,
    variableCostPerContractYen: sales.variableCostPerContractYen,
  };

  const months = await getMonthTrendRowsForYear(year, salesLike);
  const fromY = year - (annualSpan - 1);
  const annual = await getAnnualSummaries(fromY, year, salesLike);

  return NextResponse.json(
    {
      year,
      months,
      annual,
      salesLike,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    },
  );
}
