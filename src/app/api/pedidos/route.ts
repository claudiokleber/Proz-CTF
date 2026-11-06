import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";
import { getShopSessionFromRequest, parseOrderItems } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getShopSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Faça login para consultar seus pedidos." },
        { status: 401 }
      );
    }

    const orders = await shopDb.order.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        items: parseOrderItems(o.items),
        total: Number(o.total),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    return NextResponse.json(
      { error: "Erro ao consultar pedidos.", orders: [] },
      { status: 500 }
    );
  }
}
