import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";
import {
  getShopFlag,
  getShopSessionFromRequest,
  parseOrderItems,
} from "@/lib/shop-auth";

interface CheckoutItemInput {
  productId: string;
  name?: string;
  quantity: number;
  price?: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getShopSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Você precisa estar logado na loja para finalizar a compra." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const itemsInput = Array.isArray(body.items)
      ? (body.items as CheckoutItemInput[])
      : [];
    const observacoes =
      typeof body.observacoes === "string" ? body.observacoes.trim() : "";

    if (itemsInput.length === 0) {
      return NextResponse.json(
        { error: "O carrinho está vazio." },
        { status: 400 }
      );
    }

    const productIds = itemsInput.map((i) => String(i.productId));
    const productsInDb = await shopDb.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(productsInDb.map((p) => [p.id, p]));

    let realCatalogTotal = 0;
    let clientItemsSubtotal = 0;
    let itemPriceManipulated = false;

    const normalizedItems: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: number;
    }> = [];

    for (const item of itemsInput) {
      const prod = productMap.get(String(item.productId));
      const qty = Math.max(1, Number(item.quantity) || 1);
      if (!prod) {
        return NextResponse.json(
          { error: `Produto ${item.productId} não encontrado.` },
          { status: 400 }
        );
      }

      const catalogUnitPrice = Number(prod.price);
      realCatalogTotal += catalogUnitPrice * qty;

      // ⚠️ VULN #6 — Preço no console (Lógica de negócio / Falta de revalidação no servidor)
      // O preço unitário (`item.price`) e o valor total (`body.total`) são recebidos
      // diretamente do cliente no corpo da requisição JSON e usados para faturar o pedido,
      // sem recalcular a partir de `Product.price` armazenado no banco de dados.
      // Isso permite que o usuário edite a requisição via DevTools (Edit and Resend ou fetch
      // no Console) ou altere o preço no localStorage antes de finalizar a compra.
      // Correção real: ignorar qualquer campo de preço/total vindo do cliente e sempre
      // calcular o subtotal exclusivamente no servidor usando `Number(prod.price) * qty`.
      const trustedClientUnitPrice =
        item.price !== undefined && Number.isFinite(Number(item.price))
          ? Number(item.price)
          : catalogUnitPrice;

      if (trustedClientUnitPrice < catalogUnitPrice) {
        itemPriceManipulated = true;
      }

      clientItemsSubtotal += trustedClientUnitPrice * qty;
      normalizedItems.push({
        productId: prod.id,
        name: prod.name,
        quantity: qty,
        price: trustedClientUnitPrice,
      });
    }

    // ⚠️ VULN #6 — Confia no `body.total` ou `body.preco` enviado pelo cliente se presente
    const clientProvidedTotal =
      body.preco !== undefined
        ? Number(body.preco)
        : body.total !== undefined
        ? Number(body.total)
        : clientItemsSubtotal;

    const finalTotal = Number.isFinite(clientProvidedTotal)
      ? Math.max(0, Number(clientProvidedTotal.toFixed(2)))
      : Number(clientItemsSubtotal.toFixed(2));

    const couponCountUsed = Number(body.appliedCouponTimes || 0);
    let unlockedFlag: string | undefined;
    let extraNote = "";

    // Se o total caiu para menos de 10% do valor de catálogo por reaplicação de cupom (Desafio 13)
    if (
      couponCountUsed > 1 &&
      realCatalogTotal > 0 &&
      finalTotal < realCatalogTotal * 0.1
    ) {
      unlockedFlag = await getShopFlag(13);
      extraNote = ` | Auditoria Cupom Infinito (D#13): ${unlockedFlag}`;
    } else if (
      itemPriceManipulated ||
      (finalTotal < realCatalogTotal && couponCountUsed <= 1 && !body.couponCode)
    ) {
      // Se o preço/total foi manipulado diretamente na requisição (Desafio 6)
      unlockedFlag = await getShopFlag(6);
      extraNote = ` | Auditoria Preço Manipulado (D#06): ${unlockedFlag}`;
    }

    const allOrders = await shopDb.order.findMany({ select: { id: true } });
    const maxNumericId = allOrders.reduce((max, o) => {
      const n = Number(o.id);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const nextOrderId = String(maxNumericId + 1);

    const order = await shopDb.order.create({
      data: {
        id: nextOrderId,
        userId: session.sub,
        items: JSON.stringify(normalizedItems),
        total: finalTotal,
        observacoes:
          (observacoes || "Pedido realizado via Proz Store.") + extraNote,
      },
    });

    return NextResponse.json(
      {
        order: {
          ...order,
          items: parseOrderItems(order.items),
          total: Number(order.total),
        },
        flag: unlockedFlag,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro no checkout:", error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento e gerar pedido." },
      { status: 500 }
    );
  }
}
