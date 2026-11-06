import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";
import { getShopSessionFromRequest, parseOrderItems } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getShopSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Faça login para visualizar os detalhes do pedido." },
        { status: 401 }
      );
    }

    // ⚠️ VULN #7 — Pedido do vizinho (IDOR — Insecure Direct Object Reference)
    // O endpoint busca o pedido apenas pelo `params.id` informado na URL, sem verificar
    // se `order.userId === session.sub`. Assim, qualquer cliente autenticado (como
    // joao.lima@proz.com) pode trocar o ID na URL (ex.: /loja/meus-pedidos/3 ou
    // /api/pedidos/3) e visualizar pedidos de outros clientes (como maria.silva@proz.com),
    // onde está a flag no campo `observacoes`.
    // Correção real: filtrar a consulta no banco com `where: { id: params.id, userId: session.sub }`
    // ou validar explicitamente `if (order.userId !== session.sub && session.role !== "admin") return 403`.
    const order = await shopDb.order.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        ...order,
        items: parseOrderItems(order.items),
        total: Number(order.total),
      },
    });
  } catch (error) {
    console.error("Erro ao consultar pedido:", error);
    return NextResponse.json(
      { error: "Erro ao consultar detalhes do pedido." },
      { status: 500 }
    );
  }
}
