import { NextResponse } from "next/server";
import { getShopFlag } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  // ⚠️ VULN #4 — Senha na gaveta (Exposição de arquivo de exportação com senhas em texto plano)
  // Uma rota /export.csv esquecida após migração de dados devolve informações de
  // clientes sem exigir autenticação, incluindo a senha em texto puro de
  // maria.silva@proz.com (funcional no login) e a flag de auditoria.
  // Correção real: nunca armazenar senhas em texto puro (usar bcrypt/argon2),
  // nunca deixar dumps/CSVs públicos na árvore web e exigir autenticação forte.
  const flagDesafio4 = await getShopFlag(4);

  const csvLines = [
    "id,nome,email,senha_migracao,papel,observacao_auditoria",
    `user_maria,Maria Silva,maria.silva@proz.com,maria_proz_2024,cliente,"Conta VIP migrada do sistema legado — Flag: ${flagDesafio4}"`,
    `user_joao,João Lima,joao.lima@proz.com,joao2024,cliente,"Cliente padrão — cadastro ativo"`,
  ];

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="export.csv"',
    },
  });
}
