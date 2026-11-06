#!/usr/bin/env bash
# ============================================================================
# PROZ CTF — Script de Backup dos Bancos Isolados (`backup.sh`)
# ============================================================================
# Objetivo: Realizar dump consistente dos dois bancos PostgreSQL (`platform-db`
# e `shop-db`) e do arquivo de gabarito (`FLAGS_REAIS.txt`) sem exigir que a
# porta 5432 esteja exposta ao host Debian.
#
# DECISÕES TÉCNICAS E DE SEGURANÇA:
# 1. `umask 077`: Garante que a pasta de backup e todos os dumps `.sql.gz` sejam
#    criados com permissão `600`/`700` (acessíveis apenas ao usuário do instrutor),
#    já que os dumps contêm hashes de senhas, submissões das equipes e flags.
# 2. Execução via `docker compose exec -T`: Como os bancos `platform-db` e `shop-db`
#    não expõem a porta 5432 ao host (por isolamento de segurança), o `pg_dump` é
#    executado dentro do próprio container de cada banco e canalizado (pipe) via
#    stdout diretamente para o `gzip -9` no host.
# 3. Flags `--clean --if-exists --no-owner --no-privileges`: Permite restaurar o
#    dump de forma idempotente em qualquer instância PostgreSQL sem conflitos de
#    roles/owners.
# 4. Manifesto `SHA256SUMS.txt`: Registra o hash criptográfico dos arquivos de
#    backup para verificação de integridade pós-evento ou auditoria das notas.
# 5. Rotação automática (`BACKUP_RETENTION_COUNT`, padrão 20): Evita que backups
#    repetidos durante a aula esgotem o espaço em disco do notebook Debian.
# ============================================================================

set -euo pipefail

# Restringe permissões dos arquivos gerados apenas ao proprietário (chmod 600/700)
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_ROOT="${BACKUP_DIR:-./backups}"
TARGET_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-20}"

mkdir -p "$TARGET_DIR"

echo "============================================================================"
echo "💾 [Proz CTF] Iniciando backup em: ${TARGET_DIR}"
echo "============================================================================"

# 1. Verifica se os containers dos bancos estão em execução
if ! docker compose ps --status running | grep -q "platform-db"; then
  echo "❌ Erro: O serviço 'platform-db' não está em execução." >&2
  exit 1
fi

if ! docker compose ps --status running | grep -q "shop-db"; then
  echo "❌ Erro: O serviço 'shop-db' não está em execução." >&2
  exit 1
fi

# 2. Dump compactado do banco da Plataforma CTF (`platform-db`: equipes, alunos, placar)
echo "📦 [1/3] Exportando banco 'platform-db' (Equipes, Desafios e Submissões)..."
docker compose exec -T platform-db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  | gzip -9 > "${TARGET_DIR}/platform-db_${TIMESTAMP}.sql.gz"

# 3. Dump compactado do banco da Loja Vulnerável (`shop-db`: pedidos, reviews, estado dos desafios)
echo "📦 [2/3] Exportando banco 'shop-db' (Estado da Loja, Pedidos e Reviews)..."
docker compose exec -T shop-db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  | gzip -9 > "${TARGET_DIR}/shop-db_${TIMESTAMP}.sql.gz"

# 4. Copia o gabarito de flags da turma atual (do host ou de dentro do container `platform`)
echo "🔑 [3/3] Salvando cópia do gabarito de flags da sessão..."
if [ -f "./FLAGS_REAIS.txt" ]; then
  cp ./FLAGS_REAIS.txt "${TARGET_DIR}/FLAGS_REAIS_${TIMESTAMP}.txt"
elif docker compose exec -T platform test -f /app/FLAGS_REAIS.txt >/dev/null 2>&1; then
  docker compose exec -T platform cat /app/FLAGS_REAIS.txt > "${TARGET_DIR}/FLAGS_REAIS_${TIMESTAMP}.txt"
fi

# 5. Gera manifesto SHA-256 para verificação de integridade dos dumps
(
  cd "$TARGET_DIR"
  sha256sum ./* > SHA256SUMS.txt
)

# 6. Rotação de backups antigos (mantém os últimos $RETENTION_COUNT diretórios)
if [ -d "$BACKUP_ROOT" ]; then
  TOTAL_BACKUPS="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
  if [ "$TOTAL_BACKUPS" -gt "$RETENTION_COUNT" ]; then
    REMOVE_COUNT=$((TOTAL_BACKUPS - RETENTION_COUNT))
    echo "🧹 Removendo ${REMOVE_COUNT} backup(s) antigo(s) (retenção máxima: ${RETENTION_COUNT})..."
    find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | sort | head -n "$REMOVE_COUNT" | xargs rm -rf
  fi
fi

echo ""
echo "============================================================================"
echo "✅ [Proz CTF] Backup concluído com sucesso!"
echo "============================================================================"
ls -lh "$TARGET_DIR"
echo ""
echo "💡 Como restaurar este backup se necessário:"
echo "   gunzip -c ${TARGET_DIR}/platform-db_${TIMESTAMP}.sql.gz | docker compose exec -T platform-db sh -c 'psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\"'"
echo "   gunzip -c ${TARGET_DIR}/shop-db_${TIMESTAMP}.sql.gz     | docker compose exec -T shop-db sh -c 'psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\"'"
