import { PrismaClient as PlatformPrismaClient } from "../generated/platform-client";

// DECISÃO DE CONECTIVIDADE (PostgreSQL no Docker + Fallback em Build):
// Durante `next build` na construção da imagem Docker, o container do banco ainda não
// está acessível. Fornecemos uma URL sintaticamente válida como fallback na instanciação
// preguiçosa do PrismaClient, enquanto em execução real ele usa `DATABASE_URL_PLATFORM`
// apontando para `platform-db:5432` na rede isolada `platform-net`.
function resolveDatabaseUrl(rawUrl: string | undefined, defaultUrl: string): string {
  const base = rawUrl || defaultUrl;
  if (!base.startsWith("file:")) return base;
  if (base.includes("connection_limit=")) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=1&socket_timeout=30`;
}

const globalForPlatformPrisma = globalThis as unknown as {
  platformPrisma: PlatformPrismaClient | undefined;
};

export const platformDb =
  globalForPlatformPrisma.platformPrisma ??
  new PlatformPrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(
          process.env.DATABASE_URL_PLATFORM,
          "postgresql://postgres:postgres@platform-db:5432/proz_ctf_platform?schema=public"
        ),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPlatformPrisma.platformPrisma = platformDb;
