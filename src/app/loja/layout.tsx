import { Suspense } from "react";
import Link from "next/link";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopChatbot from "@/components/shop/ShopChatbot";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import { getShopFlag } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ⚠️ VULN #1 — Olhe o código-fonte (Reconhecimento / Exposição em comentário HTML)
  // A flag (ou anotação interna de desenvolvimento) é inserida diretamente em um
  // comentário HTML (<!-- -->) no rodapé da página. Embora não apareça visualmente
  // na interface, qualquer visitante pode clicar em "Exibir código-fonte" (Ctrl+U)
  // ou abrir o Inspetor de Elementos (F12) e ler o comentário.
  // Correção real: nunca deixar credenciais, chaves de homologação ou comentários
  // internos no HTML enviado ao cliente; remover comentários sensíveis no build.
  const flagDesafio1 = await getShopFlag(1);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Suspense
        fallback={
          <div className="h-24 bg-slate-900 border-b border-slate-800" />
        }
      >
        <ShopHeader />
      </Suspense>

      <div className="flex-1">{children}</div>

      <footer className="bg-slate-900 border-t border-slate-800 mt-16 py-10 px-4">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-3 gap-8 text-xs text-slate-400">
          <div>
            <h4 className="font-bold text-white text-sm mb-2">
              Proz Store Comércio de Eletrônicos Ltda.
            </h4>
            <p className="leading-relaxed">
              Equipamentos de informática, redes e periféricos de alta
              performance para estudantes e profissionais de tecnologia.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-2">Links Rápidos</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/loja" className="hover:text-amber-300">
                  Catálogo de Produtos
                </Link>
              </li>
              <li>
                <Link href="/loja/sobre" className="hover:text-amber-300">
                  Sobre Nós & Nossa História
                </Link>
              </li>
              <li>
                <Link href="/loja/meus-pedidos" className="hover:text-amber-300">
                  Acompanhar Meus Pedidos
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-2">
              Atendimento ao Cliente
            </h4>
            <p>Segunda a Sexta, das 8h às 20h</p>
            <p className="mt-1">Central de Suporte: suporte@proz.com</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Proz Store · Todos os direitos
          reservados.
        </div>

        {/* ⚠️ VULN #1 — Comentário HTML renderizado no DOM do rodapé + div oculta para F12 */}
        <div
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: `<!-- TODO [DEV-PROZ]: Remover chave de homologação do rodapé antes de colocar em produção! Flag: ${flagDesafio1} (Dica F12: Aperte Ctrl+C direto nesta linha e cole lá no CTF, ou desmarque o display:none da div abaixo!) -->`,
          }}
        />
        <div
          id="debug-homologacao-rodape"
          style={{ display: "none" }}
          className="max-w-xl mx-auto mt-4"
        >
          <FlagCopyBadge
            flag={flagDesafio1}
            label="Modo Debug do Rodapé liberado via F12 (Desafio #01):"
          />
        </div>
      </footer>

      <ShopChatbot />
    </div>
  );
}
