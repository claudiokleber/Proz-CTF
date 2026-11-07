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
# 6. Verificação de estabilidade pós-subida (até 120s): Inspeciona o estado e
#    `RestartCount` de `proz-ctf-platform` e `proz-ctf-shop` via `docker inspect` e
#    confirma a conclusão do seed nos dois serviços antes de declarar sucesso. Se
#    qualquer container cair ou entrar em loop de reinício, exibe as últimas 40
#    linhas de log com flags mascaradas (`CTF{...}`) e sai com código 1.
# 7. Extração segura de `FLAGS_REAIS.txt` (`chmod 600`): Só copia o gabarito depois
#    que o container `platform` está comprovadamente estável (`running`, sem restart).
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

# 6. Aguarda até 120 segundos até que `platform` e `shop` concluam o seed e
#    permaneçam com estado `running` e sem reiniciar (`RestartCount == 0`).
echo "⏳ Aguardando migrations, seed e estabilização dos containers (até 120s)..."
MAX_WAIT=120
ELAPSED=0
STABLE=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
  PLATFORM_STATE="$(docker inspect -f '{{.State.Status}} {{.State.Restarting}} {{.RestartCount}}' proz-ctf-platform 2>/dev/null || echo 'missing true 99')"
  SHOP_STATE="$(docker inspect -f '{{.State.Status}} {{.State.Restarting}} {{.RestartCount}}' proz-ctf-shop 2>/dev/null || echo 'missing true 99')"

  PLATFORM_STATUS="$(echo "$PLATFORM_STATE" | awk '{print $1}')"
  PLATFORM_RESTARTING="$(echo "$PLATFORM_STATE" | awk '{print $2}')"
  PLATFORM_RESTARTS="$(echo "$PLATFORM_STATE" | awk '{print $3}')"

  SHOP_STATUS="$(echo "$SHOP_STATE" | awk '{print $1}')"
  SHOP_RESTARTING="$(echo "$SHOP_STATE" | awk '{print $2}')"
  SHOP_RESTARTS="$(echo "$SHOP_STATE" | awk '{print $3}')"

  # Se qualquer um dos dois containers já reiniciou ou morreu, interrompe imediatamente
  if [ "$PLATFORM_RESTARTING" = "true" ] || [ "${PLATFORM_RESTARTS:-0}" -gt 0 ] || [ "$PLATFORM_STATUS" = "exited" ] || [ "$PLATFORM_STATUS" = "dead" ] || \
     [ "$SHOP_RESTARTING" = "true" ]     || [ "${SHOP_RESTARTS:-0}" -gt 0 ]     || [ "$SHOP_STATUS" = "exited" ]     || [ "$SHOP_STATUS" = "dead" ]; then
    echo "❌ Falha detectada: um dos containers entrou em loop de reinício ou encerrou com erro." >&2
    echo "   Estado platform: status=${PLATFORM_STATUS}, restarting=${PLATFORM_RESTARTING}, restarts=${PLATFORM_RESTARTS}" >&2
    echo "   Estado shop:     status=${SHOP_STATUS}, restarting=${SHOP_RESTARTING}, restarts=${SHOP_RESTARTS}" >&2
    break
  fi

  # Verifica se ambos estão running (sem restarts), se o platform gerou FLAGS_REAIS.txt
  # e se o entrypoint do shop já concluiu o seed e iniciou o servidor Next.js
  if [ "$PLATFORM_STATUS" = "running" ] && [ "$SHOP_STATUS" = "running" ]; then
    if docker compose exec -T platform test -f /app/FLAGS_REAIS.txt >/dev/null 2>&1 && \
       docker compose logs shop 2>/dev/null | grep -q "Banco pronto. Iniciando servidor Next.js"; then
      # Aguarda mais 2s e revalida para garantir que nenhum processo caiu logo após o seed
      sleep 2
      PLATFORM_RECHECK="$(docker inspect -f '{{.State.Status}} {{.State.Restarting}} {{.RestartCount}}' proz-ctf-platform 2>/dev/null || echo 'missing true 99')"
      SHOP_RECHECK="$(docker inspect -f '{{.State.Status}} {{.State.Restarting}} {{.RestartCount}}' proz-ctf-shop 2>/dev/null || echo 'missing true 99')"
      if [ "$PLATFORM_RECHECK" = "running false 0" ] && [ "$SHOP_RECHECK" = "running false 0" ]; then
        STABLE=true
        break
      fi
    fi
  fi

  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ "$STABLE" != "true" ]; then
  echo "" >&2
  echo "============================================================================" >&2
  echo "❌ [Proz CTF] ERRO: Os serviços 'platform' e/ou 'shop' não estabilizaram em ${MAX_WAIT}s!" >&2
  echo "============================================================================" >&2
  docker compose ps >&2 || true
  echo "" >&2
  echo "--- Últimas 40 linhas de log de 'platform' (flags mascaradas) ---" >&2
  docker compose logs --tail=40 platform 2>&1 | sed -E 's/CTF\{[^}]*\}/CTF{...}/g' >&2 || true
  echo "" >&2
  echo "--- Últimas 40 linhas de log de 'shop' (flags mascaradas) ---" >&2
  docker compose logs --tail=40 shop 2>&1 | sed -E 's/CTF\{[^}]*\}/CTF{...}/g' >&2 || true
  exit 1
fi

# 7. Extrai o FLAGS_REAIS.txt somente após confirmar que o container `platform` está estável
docker compose cp platform:/app/FLAGS_REAIS.txt ./FLAGS_REAIS.txt >/dev/null 2>&1
chmod 600 ./FLAGS_REAIS.txt

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
