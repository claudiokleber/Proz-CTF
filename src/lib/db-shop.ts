import { PrismaClient as ShopPrismaClient } from "../generated/shop-client";

// DECISÃO DE SEGURANÇA E CONECTIVIDADE:
// 1. Sem credenciais padrão fixas (`postgres:postgres@...`): em execução real,
//    `DATABASE_URL_SHOP` DEVE estar definida (via `docker-compose.yml` em produção
//    ou `.env.local` gerado por `./gerar-env.sh --dev` no desenvolvimento local).
// 2. Compatibilidade com `next build` no Docker: durante a fase `phase-production-build`,
//    fornecemos apenas uma URL sintática inofensiva para que o build não falhe ao
//    importar os módulos das rotas.
function resolveShopDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_SHOP?.trim();
  if (url) {
    return url;
  }

  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "postgresql://build-placeholder:0000@127.0.0.1:5432/build_only?schema=public";
  }

  throw new Error(
    "DATABASE_URL_SHOP não definida. Rode npm run dev:setup ou veja o README"
  );
}

const globalForShopPrisma = globalThis as unknown as {
  shopPrisma: ShopPrismaClient | undefined;
};

export const shopDb =
  globalForShopPrisma.shopPrisma ??
  new ShopPrismaClient({
    datasources: {
      db: {
        url: resolveShopDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForShopPrisma.shopPrisma = shopDb;
