#!/bin/sh
# ============================================================================
# PROZ CTF — Entrypoint dos Containers (`platform` e `shop`)
# ============================================================================
# DECISÕES TÉCNICAS E DE SEGURANÇA:
# 1. `set -eu`: Interrompe imediatamente a subida caso a migration ou o seed falhe,
#    permitindo que o Docker Compose (`restart: unless-stopped`) tente novamente
#    ou sinalize o erro nos logs.
# 2. Execução 100% Offline: Chama diretamente os binários locais em `./node_modules`
#    via `node` (sem `npx`), evitando qualquer tentativa de acesso à internet (npmjs)
#    ou escrita de cache em `~/.npm` (fundamental para o container `shop` que roda
#    com `read_only: true`).
# 3. `prisma migrate deploy`: Aplica de forma idempotente todas as migrations SQL
#    pendentes do respectivo banco (`platform-db` ou `shop-db`).
# 4. Seed apenas na primeira subida (`--if-empty`): Verifica se o banco já possui
#    registros antes de semear. Na primeira subida (ou após `./reset.sh`), popula
#    automaticamente os desafios, usuários, produtos e flags. Em reinicializações
#    subsequentes (ex.: reboot do notebook Debian), preserva intactos o placar,
#    as equipes e o progresso dos alunos.
# 5. Limpeza de segredo no `shop`: Após o seed inicial do `shop-db`, a variável
#    `CTF_FLAG_SECRET` é removida da memória (`unset`) antes de iniciar o `server.js`,
#    garantindo que o processo web da loja vulnerável nunca mantenha esse segredo.
# 6. `exec "$@"`: Substitui o processo shell pelo `node server.js` como PID 1,
#    garantindo recebimento direto de sinais POSIX (`SIGTERM`/`SIGINT`).
# ============================================================================

set -eu

ROLE="${APP_ROLE:-platform}"

echo "============================================================================"
echo "🚀 [Proz CTF] Iniciando container no papel: ${ROLE}"
echo "============================================================================"

if [ "$ROLE" = "shop" ]; then
  PRISMA_SCHEMA="prisma/shop.prisma"
  SEED_FLAG="--shop-only"
else
  PRISMA_SCHEMA="prisma/platform.prisma"
  SEED_FLAG="--platform-only"
fi

# 1. Aplica as migrations pendentes no PostgreSQL correspondente
echo "📦 [${ROLE}] Executando prisma migrate deploy (${PRISMA_SCHEMA})..."
node ./node_modules/prisma/build/index.js migrate deploy --schema="${PRISMA_SCHEMA}"

# 2. Executa o seed na primeira subida (quando o banco está vazio ou FORCE_SEED=true)
echo "🌱 [${ROLE}] Verificando necessidade de seed inicial (${SEED_FLAG} --if-empty)..."
if [ -f "./prisma/seed.cjs" ]; then
  node ./prisma/seed.cjs "${SEED_FLAG}" --if-empty
else
  node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts "${SEED_FLAG}" --if-empty
fi

# 3. Defesa em profundidade na Loja: remove segredos de seed do ambiente antes de subir o servidor HTTP
if [ "$ROLE" = "shop" ]; then
  unset CTF_FLAG_SECRET || true
  unset PLATFORM_SESSION_SECRET || true
  unset PLATFORM_ADMIN_INITIAL_PASSWORD || true
fi

echo "✅ [${ROLE}] Banco pronto. Iniciando servidor Next.js standalone na porta ${PORT:-3000}..."
exec "$@"
