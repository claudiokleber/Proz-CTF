import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";
import { getShopFlag, getShopSessionFromRequest } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getShopSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Você precisa estar logado para acessar esta rota." },
        { status: 401 }
      );
    }

    // ⚠️ VULN #14 — Área restrita (Broken Access Control / Falta de verificação de role no servidor)
    // Embora o link para `/admin/usuarios` esteja escondido com CSS (`display: none`) no menu
    // do painel de suporte, este endpoint verifica apenas se o usuário está autenticado
    // (`if (!session)`), esquecendo de validar `if (session.role !== "admin")`.
    // Dessa forma, o usuário `suporte@proz.com` (ou qualquer usuário logado que acesse a URL
    // diretamente) obtém a listagem administrativa de usuários, o e-mail `admin@proz.com`
    // e a flag do Desafio 14.
    // Correção real: sempre validar o papel (`session.role === "admin"`) no servidor antes
    // de retornar dados administrativos.
    const [users, flagDesafio14] = await Promise.all([
      shopDb.shopUser.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      getShopFlag(14),
    ]);

    return NextResponse.json({
      users,
      flagDesafio14,
    });
  } catch (error) {
    console.error("Erro em GET /api/loja/usuarios:", error);
    return NextResponse.json(
      { error: "Erro ao consultar usuários.", users: [] },
      { status: 500 }
    );
  }
}
