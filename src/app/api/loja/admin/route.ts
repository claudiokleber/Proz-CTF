import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";
import {
  getShopFlag,
  getShopSessionFromRequest,
  parseOrderItems,
} from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getShopSessionFromRequest(req);

    // ⚠️ VULN #15 e #17 — Painel Administrativo da Loja
    // - No Desafio 15, o aluno edita o payload do seu próprio JWT no `localStorage`
    //   para `"role": "admin"` (usando `alg: "none"`, segredo fraco ou payload adulterado)
    //   e acessa o painel admin para capturar `flagDesafio15`.
    // - No Desafio 17, o aluno descobre o e-mail `admin@proz.com`, obtém o token de
    //   recuperação em `POST /api/recuperar-senha`, redefine a senha de `admin@proz.com`
    //   e faz login real na conta mestra do administrador, liberando `flagDesafio17`.
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso restrito ao administrador da loja." },
        { status: 403 }
      );
    }

    const [products, orders, coupons, users, flagDesafio15, flagDesafio17] =
      await Promise.all([
        shopDb.product.findMany({ orderBy: { id: "asc" } }),
        shopDb.order.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        shopDb.coupon.findMany({ orderBy: { code: "asc" } }),
        shopDb.shopUser.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }),
        getShopFlag(15),
        getShopFlag(17),
      ]);

    const isMasterAdminAccount =
      session.email === "admin@proz.com" && !session.forgedJwt;

    return NextResponse.json({
      sessionInfo: {
        email: session.email,
        role: session.role,
        forgedJwt: Boolean(session.forgedJwt),
        isMasterAdminAccount,
      },
      flagDesafio15,
      flagDesafio17: isMasterAdminAccount ? flagDesafio17 : null,
      products: products
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((p) => ({
          ...p,
          price: Number(p.price),
          custoInterno: Number(p.custoInterno),
        })),
      orders: orders.map((o) => ({
        ...o,
        items: parseOrderItems(o.items),
        total: Number(o.total),
      })),
      coupons,
      users,
    });
  } catch (error) {
    console.error("Erro ao carregar painel admin da loja:", error);
    return NextResponse.json(
      { error: "Erro ao carregar dados administrativos da loja." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getShopSessionFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json(
      { error: "Acesso restrito ao administrador da loja." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "updateProductPrice") {
      const productId = String(body.productId || "");
      const price = Number(body.price);
      if (!productId || !Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { error: "ID do produto e novo preço válido são obrigatórios." },
          { status: 400 }
        );
      }

      const updated = await shopDb.product.update({
        where: { id: productId },
        data: { price },
      });

      return NextResponse.json({
        product: { ...updated, price: Number(updated.price) },
      });
    }

    if (action === "upsertCoupon") {
      const code = String(body.code || "")
        .trim()
        .toUpperCase();
      const percent = Number(body.percent);
      const usesLeft = Number(body.usesLeft);

      if (!code || !Number.isFinite(percent) || percent <= 0 || percent > 100) {
        return NextResponse.json(
          { error: "Informe código e percentual (1 a 100)." },
          { status: 400 }
        );
      }

      const coupon = await shopDb.coupon.upsert({
        where: { code },
        update: { percent, usesLeft },
        create: { code, percent, usesLeft },
      });

      return NextResponse.json({ coupon });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("Erro na administração da loja:", error);
    return NextResponse.json(
      { error: "Erro ao processar ação administrativa da loja." },
      { status: 500 }
    );
  }
}
