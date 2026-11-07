import { PrismaClient as PlatformPrismaClient } from "../generated/platform-client";

// DECISÃO DE SEGURANÇA E CONECTIVIDADE:
// 1. Sem credenciais padrão fixas (`postgres:postgres@...`): em execução real,
//    `DATABASE_URL_PLATFORM` DEVE estar definida (via `docker-compose.yml` em produção
//    ou `.env.local` gerado por `./gerar-env.sh --dev` no desenvolvimento local).
// 2. Compatibilidade com `next build` no Docker: durante a fase `phase-production-build`,
//    o Next.js importa os módulos de rota para análise estática sem banco ativo; apenas
//    nessa fase fornecemos uma URL sintática inofensiva para o construtor do PrismaClient.
function resolvePlatformDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_PLATFORM?.trim();
  if (url) {
    return url;
  }

  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "postgresql://build-placeholder:0000@127.0.0.1:5432/build_only?schema=public";
  }

  throw new Error(
    "DATABASE_URL_PLATFORM não definida. Rode npm run dev:setup ou veja o README"
  );
}

const globalForPlatformPrisma = globalThis as unknown as {
  platformPrisma: PlatformPrismaClient | undefined;
};

export const platformDb =
  globalForPlatformPrisma.platformPrisma ??
  new PlatformPrismaClient({
    datasources: {
      db: {
        url: resolvePlatformDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPlatformPrisma.platformPrisma = platformDb;
