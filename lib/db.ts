import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** 開発時: schema 変更後に古い global キャッシュが残ると新モデルの delegate が undefined になるため検証する */
function clientHasCurrentModels(client: PrismaClient): boolean {
  const c = client as unknown as {
    pricingSegment?: { findMany?: unknown };
    contractPlanTarget?: { findMany?: unknown };
    contractMonthExtra?: { findMany?: unknown };
  };
  return (
    typeof c.pricingSegment?.findMany === "function" &&
    typeof c.contractPlanTarget?.findMany === "function" &&
    typeof c.contractMonthExtra?.findMany === "function"
  );
}

function resolvePrisma(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return globalForPrisma.prisma ?? createPrisma();
  }

  const cached = globalForPrisma.prisma;
  if (cached && clientHasCurrentModels(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => {});
  }

  const fresh = createPrisma();
  globalForPrisma.prisma = fresh;
  return fresh;
}

export const prisma = resolvePrisma();
