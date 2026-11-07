#!/usr/bin/env bash
# ============================================================================
# PROZ CTF — Gerador Seguro de `.env` e `.env.local` (`gerar-env.sh`)
# ============================================================================
# DECISÕES TÉCNICAS E DE SEGURANÇA:
# 1. `set -euo pipefail`: Interrompe imediatamente em caso de erro, variável
#    não inicializada ou falha em pipeline (ex.: ausência do `openssl`).
# 2. Proteção contra sobrescrita acidental: Se `.env` já existir, aborta a
#    menos que receba `--force` (ou `--dev`, que apenas lê o `.env` existente
#    para montar o `.env.local`). Isso evita invalidar acidentalmente as senhas
#    já gravadas nos volumes persistentes do PostgreSQL (`platform-db-data` e
#    `shop-db-data`) ou as flags de uma turma em andamento.
# 3. `umask 077` + `chmod 600`: Garante que `.env` e `.env.local` nasçam
#    restritos ao usuário proprietário desde o momento de criação.
# 4. Segredos criptograficamente fortes e independentes via `openssl rand -hex`:
#    - `PLATFORM_DB_PASSWORD` e `SHOP_DB_PASSWORD`: 16 bytes (128 bits / 32 hex)
#      distintos entre si para isolar a autenticação de cada banco PostgreSQL.
#    - `PLATFORM_SESSION_SECRET` e `CTF_FLAG_SECRET`: 32 bytes (256 bits / 64 hex)
#      distintos para assinatura HMAC-SHA256 de sessão e derivação das 17 flags.
# 5. Sem `DATABASE_URL_*` no `.env`: O `docker-compose.yml` de produção monta
#    as URLs apontando para `platform-db:5432` e `shop-db:5432`.
# 6. Modo `--dev` (`.env.local`): Gera `.env.local` (ignorado pelo Git) com
#    `DATABASE_URL_PLATFORM` (`127.0.0.1:5433`) e `DATABASE_URL_SHOP`
#    (`127.0.0.1:5434`) usando as mesmas senhas do `.env` (criando o `.env`
#    primeiro se ele ainda não existir).
# 7. Silêncio sobre segredos no terminal: Os valores gerados nunca são exibidos
#    no stdout/stderr.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env"
ENV_LOCAL_FILE=".env.local"
FORCE=false
DEV_MODE=false

for arg in "$@"; do
  case "$arg" in
    --force)
      FORCE=true
      ;;
    --dev)
      DEV_MODE=true
      ;;
    *)
      echo "❌ Erro: Argumento desconhecido '$arg'. Use: ./gerar-env.sh [--force] [--dev]" >&2
      exit 1
      ;;
  esac
done

if ! command -v openssl >/dev/null 2>&1; then
  echo "❌ Erro: 'openssl' não encontrado no PATH. Instale o pacote openssl para gerar os segredos." >&2
  exit 1
fi

# Restringe permissões de criação de arquivos apenas ao dono (0600)
umask 077

generate_main_env() {
  local platform_db_pass shop_db_pass platform_sess_secret flag_master_secret
  platform_db_pass="$(openssl rand -hex 16)"
  shop_db_pass="$(openssl rand -hex 16)"
  platform_sess_secret="$(openssl rand -hex 32)"
  flag_master_secret="$(openssl rand -hex 32)"

  cat > "$ENV_FILE" <<EOF
# ============================================================================
# PROZ CTF — Variáveis de Ambiente (Gerado automaticamente por ./gerar-env.sh)
# ============================================================================
# IMPORTANTE: Nunca faça commit deste arquivo (.env) nem de FLAGS_REAIS.txt.
# ============================================================================

# ----------------------------------------------------------------------------
# 1. Portas Expostas no Host (Notebook Debian / Rede Local da Sala de Aula)
# ----------------------------------------------------------------------------
PLATFORM_PORT=3000
SHOP_PORT=3001

# ----------------------------------------------------------------------------
# 2. Credenciais do Banco PostgreSQL da Plataforma CTF (\`platform-db\`)
# ----------------------------------------------------------------------------
PLATFORM_DB_USER=proz_platform
PLATFORM_DB_PASSWORD=${platform_db_pass}
PLATFORM_DB_NAME=proz_ctf_platform

# ----------------------------------------------------------------------------
# 3. Credenciais do Banco PostgreSQL da Loja Vulnerável (\`shop-db\`)
# ----------------------------------------------------------------------------
SHOP_DB_USER=proz_shop
SHOP_DB_PASSWORD=${shop_db_pass}
SHOP_DB_NAME=proz_ctf_shop

# ----------------------------------------------------------------------------
# 4. Segredos Criptográficos e Credenciais Iniciais
# ----------------------------------------------------------------------------
PLATFORM_SESSION_SECRET=${platform_sess_secret}
CTF_FLAG_SECRET=${flag_master_secret}
PLATFORM_ADMIN_INITIAL_PASSWORD=""
COOKIE_SECURE="false"

# ----------------------------------------------------------------------------
# 5. Limites de Recursos do Container da Loja Vulnerável (\`shop\`)
# ----------------------------------------------------------------------------
SHOP_MEM_LIMIT=512m
SHOP_CPU_LIMIT=1.0

# ----------------------------------------------------------------------------
# 6. Configuração Opcional do Chatbot ProzBot (100% Offline por Padrão)
# ----------------------------------------------------------------------------
AI_API_KEY=""
AI_API_MODEL="gpt-4o-mini"
EOF

  chmod 600 "$ENV_FILE"
  echo "✅ Arquivo '$ENV_FILE' criado com sucesso (permissão 600) contendo novos segredos aleatórios."
}

read_env_var() {
  local key="$1"
  local default_val="${2:-}"
  local val
  val="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- | tr -d '\r"' || true)"
  if [ -z "$val" ]; then
    echo "$default_val"
  else
    echo "$val"
  fi
}

if [ "$DEV_MODE" = "false" ]; then
  if [ -f "$ENV_FILE" ]; then
    if [ "$FORCE" != "true" ]; then
      echo "❌ Erro: O arquivo '$ENV_FILE' já existe." >&2
      echo "⚠️  Atenção: Sobrescrever o '$ENV_FILE' troca as senhas dos bancos e invalida os volumes" >&2
      echo "   PostgreSQL existentes (exigindo './reset.sh' ou 'docker compose down -v')." >&2
      echo "   Se desejar realmente gerar um novo '$ENV_FILE', execute:" >&2
      echo "     ./gerar-env.sh --force" >&2
      exit 1
    else
      echo "⚠️  Aviso (--force): Sobrescrevendo '$ENV_FILE'. Caso os bancos já tenham sido criados,"
      echo "   será necessário recriar os volumes com './reset.sh' (ou 'docker compose down -v')."
    fi
  fi
  generate_main_env
else
  # Modo --dev: garante que o .env exista primeiro (ou recria se --force foi passado)
  if [ ! -f "$ENV_FILE" ]; then
    echo "ℹ️  Arquivo '$ENV_FILE' ainda não existe. Gerando '$ENV_FILE' primeiro..."
    generate_main_env
  elif [ "$FORCE" = "true" ]; then
    echo "⚠️  Aviso (--force): Sobrescrevendo '$ENV_FILE' antes de gerar '$ENV_LOCAL_FILE'..."
    generate_main_env
  fi

  PLATFORM_USER="$(read_env_var "PLATFORM_DB_USER" "proz_platform")"
  PLATFORM_PASS="$(read_env_var "PLATFORM_DB_PASSWORD" "")"
  PLATFORM_NAME="$(read_env_var "PLATFORM_DB_NAME" "proz_ctf_platform")"

  SHOP_USER="$(read_env_var "SHOP_DB_USER" "proz_shop")"
  SHOP_PASS="$(read_env_var "SHOP_DB_PASSWORD" "")"
  SHOP_NAME="$(read_env_var "SHOP_DB_NAME" "proz_ctf_shop")"

  if [ -z "$PLATFORM_PASS" ] || [ -z "$SHOP_PASS" ]; then
    echo "❌ Erro: PLATFORM_DB_PASSWORD ou SHOP_DB_PASSWORD está vazio no '$ENV_FILE'." >&2
    echo "   Execute './gerar-env.sh --force' para gerar segredos válidos." >&2
    exit 1
  fi

  cat > "$ENV_LOCAL_FILE" <<EOF
# ============================================================================
# PROZ CTF — URLs de Conexão para Desenvolvimento Local (\`.env.local\`)
# ============================================================================
# Gerado automaticamente por \`./gerar-env.sh --dev\` a partir do \`.env\`.
# Aponta para os containers PostgreSQL de \`docker-compose.dev.yml\` em 127.0.0.1.
# IMPORTANTE: Ignorado pelo Git. Nunca faça commit deste arquivo.
# ============================================================================

DATABASE_URL_PLATFORM="postgresql://${PLATFORM_USER}:${PLATFORM_PASS}@127.0.0.1:5433/${PLATFORM_NAME}?schema=public"
DATABASE_URL_SHOP="postgresql://${SHOP_USER}:${SHOP_PASS}@127.0.0.1:5434/${SHOP_NAME}?schema=public"
EOF

  chmod 600 "$ENV_LOCAL_FILE"
  echo "✅ Arquivo '$ENV_LOCAL_FILE' criado com sucesso (permissão 600) apontando para 127.0.0.1:5433 e 127.0.0.1:5434."
fi
