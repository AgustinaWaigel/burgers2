import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};
const databaseUrl = process.env.DATABASE_URL;
const prismaDatabaseUrl = databaseUrl
  ? (() => {
      const url = new URL(databaseUrl);
      if (url.hostname.endsWith(".pooler.supabase.com")) {
        url.searchParams.set("connection_limit", "1");
        url.searchParams.set("pool_timeout", "20");
      }
      return url.toString();
    })()
  : undefined;
const cachedClient = globalForPrisma.prismaDatabaseUrl === prismaDatabaseUrl
  ? globalForPrisma.prisma
  : undefined;

if (globalForPrisma.prisma && !cachedClient) {
  void globalForPrisma.prisma.$disconnect().catch(() => {});
}

export const prisma =
  cachedClient ??
  new PrismaClient({
    ...(prismaDatabaseUrl ? { datasourceUrl: prismaDatabaseUrl } : {}),
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatabaseUrl = prismaDatabaseUrl;
}

export function isDatabaseConfigured() {
  if (!databaseUrl) return false;
  try {
    const url = new URL(databaseUrl);
    return (url.protocol === "postgresql:" || url.protocol === "postgres:")
      && Boolean(url.hostname)
      && url.pathname.length > 1;
  } catch {
    return false;
  }
}
