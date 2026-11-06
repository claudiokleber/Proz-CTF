import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";
import { getShopFlag, getShopSessionFromRequest } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = String(params.id || "").trim();

    // ⚠️ VULN #3 — Erro demais (Configuração incorreta / Debug verboso em produção)
    // Quando o parâmetro `id` na rota /produto/[id] não é um número inteiro positivo válido
    // (ex.: /produto/abc ou /produto/-1), o sistema devolve informações internas de debug,
    // incluindo um bloco fictício de variáveis de ambiente contendo a flag.
    // Correção real: desativar modo debug em produção, retornar mensagens de erro genéricas
    // (400/404) ao cliente e registrar detalhes técnicos apenas em logs internos do servidor.
    if (!/^\d+$/.test(rawId) || Number(rawId) <= 0) {
      const flagDesafio3 = await getShopFlag(3);
      return NextResponse.json(
        {
          error: `Unhandled Runtime Exception: InvalidProductIdCastError — Cannot cast "${rawId}" to PositiveInt32`,
          debugMode: true,
          stackTrace: [
            `at ProductRepository.findByNumericId (src/services/catalog.ts:42:15)`,
            `at GET (src/app/api/produtos/[id]/route.ts:19:11)`,
          ],
          debugEnv: {
            NODE_ENV: "development_debug_enabled",
            APP_NAME: "ProzStore-Ecommerce-v1.4",
            CACHE_DRIVER: "in-memory",
            PROZ_DEBUG_SECRET_FLAG: flagDesafio3,
            SUPPORT_GATEWAY: "internal.proz.local:8080",
          },
        },
        { status: 500 }
      );
    }

    const product = await shopDb.product.findUnique({
      where: { id: rawId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        stock: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product: {
        ...product,
        price: Number(product.price),
      },
    });
  } catch (error) {
    console.error("Erro ao consultar produto:", error);
    return NextResponse.json(
      { error: "Erro ao consultar detalhes do produto." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getShopSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Faça login na loja para publicar uma avaliação." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!content || content.length < 2) {
      return NextResponse.json(
        { error: "Escreva um comentário válido para a avaliação." },
        { status: 400 }
      );
    }

    const product = await shopDb.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    const review = await shopDb.review.create({
      data: {
        productId: product.id,
        userId: session.sub,
        content,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Erro ao publicar avaliação:", error);
    return NextResponse.json(
      { error: "Erro ao salvar avaliação." },
      { status: 500 }
    );
  }
}
