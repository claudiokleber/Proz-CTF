#!/usr/bin/env bash
# ============================================================================
# PROZ CTF — Script de Reset Completo (`reset.sh`)
# ============================================================================
# Objetivo: Derrubar os containers, apagar os volumes persistentes dos bancos
# PostgreSQL (`platform-db` e `shop-db`) e subir todo o ambiente limpo para uma
# nova turma, sem depender de conexão com a internet.
#
# DECISÕES TÉCNICAS E DE SEGURANÇA:
# 1. `set -euo pipefail`: Aborta imediatamente em qualquer erro de comando,
#    variável não definida ou falha em pipeline.
# 2. Exigência de `.env` previamente gerado por `./gerar-env.sh`: O script NUNCA
#    copia `.env.example` automaticamente, pois `.env.example` possui segredos em
#    branco por segurança. Se `.env` não existir, o script aborta e instrui o
#    usuário a executar `./gerar-env.sh`.
# 3. Rotação de `CTF_FLAG_SECRET` (com suporte a `KEEP_FLAGS=true`): A cada reset
#    padrão, gera um novo segredo aleatório de 32 bytes (256 bits), atualiza apenas
#    a linha `CTF_FLAG_SECRET=` no `.env` preservando as demais configurações e a
#    permissão restrita `chmod 600`, garantindo 17 flags inéditas para a nova turma.
#    Se `KEEP_FLAGS=true`, preserva o `CTF_FLAG_SECRET` atual do `.env`.
# 4. `docker compose down -v --remove-orphans`: Derruba os 4 serviços, remove as
#    redes e destrói os volumes `proz-ctf-platform-db-data` e `proz-ctf-shop-db-data`.
# 5. Subida offline (`docker compose up -d`): Reutiliza as imagens já presentes no
#    notebook Debian (construindo apenas se ainda não existirem localmente).
#    Como os volumes foram apagados, o `docker-entrypoint.sh` detecta "primeira
#    subida" e executa `prisma migrate deploy` + `seed` automaticamente.
# 6. Extração segura de `FLAGS_REAIS.txt` (`chmod 600`): Copia o gabarito gerado
#    pelo container `platform` para a máquina do instrutor com permissão restrita
#    apenas ao dono do arquivo.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================================"
echo "🔄 [Proz CTF] Iniciando reset completo do ambiente Docker..."
echo "============================================================================"

# 1. DECISÃO DE SEGURANÇA: Exige que o `.env` já tenha sido criado via `./gerar-env.sh`.
#    Não copiamos `.env.example` porque ele tem segredos vazios para impedir uso de padrões públicos.
if [ ! -f ".env" ]; then
  echo "❌ Erro: Arquivo '.env' não encontrado." >&2
  echo "   Execute './gerar-env.sh' antes de rodar o './reset.sh' para gerar segredos exclusivos." >&2
  exit 1
fi

# 2. Rotaciona o CTF_FLAG_SECRET localmente para que a nova subida gere 17 flags
#    novas e sincronizadas entre `platform` e `shop` (exceto quando KEEP_FLAGS=true).
#    DECISÃO: Usa `umask 077` e `chmod 600 .env` após o `sed -i` (pois o `sed -i` cria
#    um arquivo temporário que poderia perder a permissão 600 sem umask/chmod explícitos).
umask 077
if [ "${KEEP_FLAGS:-false}" != "true" ]; then
  if command -v openssl >/dev/null 2>&1; then
    NEW_SECRET="$(openssl rand -hex 32)"
  else
    NEW_SECRET="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
  fi

  if grep -q "^CTF_FLAG_SECRET=" .env; then
    sed -i "s|^CTF_FLAG_SECRET=.*|CTF_FLAG_SECRET=${NEW_SECRET}|" .env
  else
    echo "CTF_FLAG_SECRET=${NEW_SECRET}" >> .env
  fi
  chmod 600 .env
  export CTF_FLAG_SECRET="${NEW_SECRET}"
  echo "🔑 Novo segredo de derivação de flags (CTF_FLAG_SECRET) gravado no .env (chmod 600)."
else
  chmod 600 .env
  echo "♻️  KEEP_FLAGS=true: Mantendo o CTF_FLAG_SECRET atual do .env."
fi

# 3. Derruba os containers e apaga os volumes de banco de dados (-v)
echo "🛑 Derrubando serviços e removendo volumes persistentes (platform-db e shop-db)..."
docker compose down -v --remove-orphans

# Remove o gabarito antigo do host se existir
rm -f FLAGS_REAIS.txt

# 4. Verifica se as imagens locais já existem; se não existirem, constrói antes de subir
if ! docker image inspect proz-ctf-platform:latest >/dev/null 2>&1 || \
   ! docker image inspect proz-ctf-shop:latest >/dev/null 2>&1; then
  echo "🔨 Imagens locais ainda não construídas. Executando build inicial..."
  docker compose build
fi

# 5. Sobe os 4 serviços limpos em background
#    O healthcheck dos bancos + depends_on + docker-entrypoint.sh rodarão
#    automaticamente o `prisma migrate deploy` e o `seed` inicial.
echo "🚀 Subindo containers limpos (platform-db, shop-db, platform, shop)..."
docker compose up -d

# 6. Aguarda o entrypoint do container `platform` concluir o seed e gerar FLAGS_REAIS.txt
echo "⏳ Aguardando conclusão das migrations e do seed inicial..."
MAX_WAIT=60
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if docker compose exec -T platform test -f /app/FLAGS_REAIS.txt >/dev/null 2>&1; then
    docker compose cp platform:/app/FLAGS_REAIS.txt ./FLAGS_REAIS.txt >/dev/null 2>&1 || true
    chmod 600 ./FLAGS_REAIS.txt 2>/dev/null || true
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo ""
echo "============================================================================"
echo "✅ [Proz CTF] Ambiente resetado e pronto para uso!"
echo "============================================================================"
docker compose ps
echo ""
if [ -f "./FLAGS_REAIS.txt" ]; then
  echo "🔐 Gabarito atualizado em ./FLAGS_REAIS.txt (permissão 600)."
  echo "   Para visualizar as credenciais do instrutor e as 17 flags:"
  echo "   cat FLAGS_REAIS.txt"
else
  echo "ℹ️  Consulte os logs do seed com: docker compose logs platform"
fi
