import { getShopFlag } from "@/lib/shop-auth";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";

export const dynamic = "force-dynamic";

export default async function BackupAntigoPage() {
  // ⚠️ VULN #2 — O que o robô não deve ver (Exposição de dados via robots.txt)
  // A rota /backup-antigo foi listada com "Disallow: /backup-antigo" em /robots.txt
  // na expectativa de escondê-la de mecanismos de busca, mas permanece pública e sem
  // qualquer controle de autenticação no servidor.
  // Correção real: nunca usar robots.txt como mecanismo de segurança; remover arquivos
  // de backup do diretório web público e exigir autenticação/autorização no servidor.
  const flagDesafio2 = await getShopFlag(2);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 font-mono text-sm">
      <div className="rounded-xl bg-slate-900 border border-amber-500/40 p-6 space-y-4">
        <h1 className="text-lg font-bold text-amber-400">
          [INDEX OF /backup-antigo] — Diretório de Migração Legada
        </h1>
        <p className="text-slate-300">
          Este diretório foi bloqueado no <code>/robots.txt</code> para não
          aparecer nos buscadores.
        </p>

        <FlagCopyBadge
          flag={flagDesafio2}
          label="Chave de verificação do backup antigo (Desafio #02):"
        />

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-1">
          <p>Log de migração (2024-10-15):</p>
          <p>
            • Catálogo de produtos importado com sucesso para o novo banco.
          </p>
          {/* Referência discreta para o Desafio 4 (/export.csv) */}
          <p>
            • Planilha temporária de clientes gerada na raiz do servidor:{" "}
            <code className="text-slate-400">/export.csv</code> (lembrar de
            apagar após conferência).
          </p>
        </div>
      </div>
    </main>
  );
}
