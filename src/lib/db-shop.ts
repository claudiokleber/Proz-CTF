import { PrismaClient as ShopPrismaClient } from "../generated/shop-client";

// DECISÃO DE CONECTIVIDADE (PostgreSQL no Docker + Fallback em Build):
// Em produção no Docker Compose, `shop` conecta-se exclusivamente ao container `shop-db`
// pela rede Docker interna `shop-net`, sem qualquer acesso ao banco `platform-db`.
function resolveDatabaseUrl(rawUrl: string | undefined, defaultUrl: string): string {
  const base = rawUrl || defaultUrl;
  if (!base.startsWith("file:")) return base;
  if (base.includes("connection_limit=")) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=1&socket_timeout=30`;
}

const globalForShopPrisma = globalThis as unknown as {
  shopPrisma: ShopPrismaClient | undefined;
};

export const shopDb =
  globalForShopPrisma.shopPrisma ??
  new ShopPrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(
          process.env.DATABASE_URL_SHOP,
          "postgresql://postgres:postgres@shop-db:5432/proz_ctf_shop?schema=public"
        ),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForShopPrisma.shopPrisma = shopDb;
