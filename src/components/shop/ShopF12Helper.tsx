"use client";

import { useEffect } from "react";
import { copyTextSafe } from "@/lib/clipboard";

export default function ShopF12Helper({ flagDesafio1 }: { flagDesafio1: string }) {
  useEffect(() => {
    // ⚠️ VULN #1 — Auxiliar para quem inspeciona via F12 (Aba Console ou Elements)
    // No Elements do F12, clicar na linha do comentário <!-- ... --> e apertar Ctrl+C
    // copia o nó inteiro (que o campo de envio do /ctf/desafios limpa automaticamente).
    // Além disso, expomos no Console o log de debug esquecido e o atalho `copiarFlagRodape()`
    // para que o aluno consiga selecionar com o mouse ou copiar em 1 comando no F12.
    console.log(
      "%c[DEV-PROZ TODO] Remover chave de homologação do rodapé antes de ir para produção! Flag: " +
        flagDesafio1,
      "color: #fbbf24; font-family: monospace; font-size: 12px;"
    );

    (window as unknown as Record<string, unknown>).copiarFlagRodape = () => {
      copyTextSafe(flagDesafio1);
      return `Flag ${flagDesafio1} copiada para a área de transferência!`;
    };
  }, [flagDesafio1]);

  return null;
}
