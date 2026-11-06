import { NextRequest, NextResponse } from "next/server";
import { getShopFlag, getShopSessionFromRequest } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getShopSessionFromRequest(req);
    if (
      !session ||
      (session.role !== "suporte" && session.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Acesso restrito ao setor de suporte." },
        { status: 403 }
      );
    }

    // ⚠️ VULN #9 — Senha fácil de adivinhar (Acesso ao painel de suporte via senha fraca `proz2010`)
    const flagDesafio9 = await getShopFlag(9);

    return NextResponse.json({
      user: {
        id: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      flagDesafio9,
    });
  } catch (error) {
    console.error("Erro em GET /api/loja/suporte:", error);
    return NextResponse.json(
      { error: "Erro ao consultar painel de suporte." },
      { status: 500 }
    );
  }
}
