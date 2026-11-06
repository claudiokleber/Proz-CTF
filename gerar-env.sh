#!/usr/bin/env bash
# ============================================================================
# PROZ CTF — Gerador Seguro de `.env` (`gerar-env.sh`)
# ============================================================================
# DECISÕES TÉCNICAS E DE SEGURANÇA:
# 1. `set -euo pipefail`: Interrompe imediatamente em caso de erro, variável
#    não inicializada ou falha em pipeline (ex.: ausência do `openssl`).
# 2. Proteção contra sobrescrita acidental: Se `.env` já existir, aborta a
#    menos que receba `--force`. Isso evita invalidar acidentalmente as senhas
#    já gravadas nos volumes persistentes do PostgreSQL (`platform-db-data` e
#    `shop-db-data`) ou as flags de uma turma em andamento.
# 3. `umask 077` + `chmod 600`: Garante que o arquivo `.env` nasça restrito ao
#    usuário proprietário desde o momento de criação (sem janela de leitura para
#    outros usuários locais do sistema).
# 4. Segredos criptograficamente fortes e independentes via `openssl rand -hex`:
#    - `PLATFORM_DB_PASSWORD` e `SHOP_DB_PASSWORD`: 16 bytes (128 bits / 32 hex)
#      distintos entre si para isolar a autenticação de cada banco PostgreSQL.
#    - `PLATFORM_SESSION_SECRET` e `CTF_FLAG_SECRET`: 32 bytes (256 bits / 64 hex)
#      distintos para assinatura HMAC-SHA256 de sessão e derivação das 17 flags.
# 5. Sem `DATABASE_URL_*` no `.env`: O `docker-compose.yml` monta as URLs de
#    conexão dinamicamente a partir de `*_DB_USER`, `*_DB_PASSWORD` e `*_DB_NAME`,
#    evitando duplicação de segredos e divergência entre variáveis.
# 6. Silêncio sobre segredos no terminal: Os valores gerados nunca são exibidos
#    no stdout/stderr (evitando vazamento em histórico de terminal, logs ou tela
#    projetada em sala de aula).
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env"
FORCE="${1:-}"

if [ -f "$ENV_FILE" ]; then
  if [ "$FORCE" != "--force" ]; then
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

if ! command -v openssl >/dev/null 2>&1; then
  echo "❌ Erro: 'openssl' não encontrado no PATH. Instale o pacote openssl para gerar os segredos." >&2
  exit 1
fi

# Restringe permissões de criação de arquivos apenas ao dono (0600)
umask 077

PLATFORM_DB_PASS="$(openssl rand -hex 16)"
SHOP_DB_PASS="$(openssl rand -hex 16)"
PLATFORM_SESS_SECRET="$(openssl rand -hex 32)"
FLAG_MASTER_SECRET="$(openssl rand -hex 32)"

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
PLATFORM_DB_PASSWORD=${PLATFORM_DB_PASS}
PLATFORM_DB_NAME=proz_ctf_platform

# ----------------------------------------------------------------------------
# 3. Credenciais do Banco PostgreSQL da Loja Vulnerável (\`shop-db\`)
# ----------------------------------------------------------------------------
SHOP_DB_USER=proz_shop
SHOP_DB_PASSWORD=${SHOP_DB_PASS}
SHOP_DB_NAME=proz_ctf_shop

# ----------------------------------------------------------------------------
# 4. Segredos Criptográficos e Credenciais Iniciais
# ----------------------------------------------------------------------------
PLATFORM_SESSION_SECRET=${PLATFORM_SESS_SECRET}
CTF_FLAG_SECRET=${FLAG_MASTER_SECRET}
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
