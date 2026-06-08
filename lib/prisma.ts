import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma como singleton. En desarrollo, Next.js recarga modulos
 * constantemente; sin el singleton se crearian decenas de conexiones.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
