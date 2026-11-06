import { NextRequest, NextResponse } from "next/server";
import { getShopFlag, getShopSessionFromRequest } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getShopSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    let accountFlag: string | undefined;
    // Se o aluno logar como maria.silva@proz.com (Desafio 4), exibe também a flag no perfil
    if (session.email === "maria.silva@proz.com") {
      accountFlag = await getShopFlag(4);
    }

    return NextResponse.json({
      user: {
        id: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
        accountFlag,
      },
    });
  } catch (error) {
    console.error("Erro em GET /api/loja/me:", error);
    return NextResponse.json({ user: null });
  }
}
