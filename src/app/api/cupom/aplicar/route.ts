import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!code) {
      return NextResponse.json(
        { error: "Informe o código do cupom." },
        { status: 400 }
      );
    }

    // ⚠️ VULN #13 — Cupom infinito (Lógica de negócio / Controle de uso não atômico)
    // 1. O endpoint lê `coupon.usesLeft` em uma consulta separada, sem lock ou
    //    transação atômica (`updateMany` com `where: { code, usesLeft: { gt: 0 } }`),
    //    abrindo uma janela de condição de corrida (TOCTOU / Race Condition).
    // 2. Além disso, o servidor devolve o percentual de desconto a cada chamada sem
    //    vincular o uso único ao pedido/sessão no servidor, permitindo que o cliente
    //    acumule o mesmo cupom (`BEMVINDO10`) repetidas vezes no carrinho até reduzir
    //    o total para menos de 10% do preço original.
    // Correção real: validar e consumir o cupom uma única vez dentro da transação de
    // fechamento do pedido (`$transaction`) com `updateMany({ where: { id, usesLeft: { gt: 0 } }, data: { usesLeft: { decrement: 1 } } })`
    // e impedir acúmulo do mesmo cupom no cálculo do total no servidor.
    const coupon = await shopDb.coupon.findUnique({
      where: { code },
    });

    if (!coupon || coupon.usesLeft <= 0) {
      return NextResponse.json(
        { error: "Cupom inválido ou esgotado." },
        { status: 400 }
      );
    }

    // Simula janela não atômica entre leitura (check) e gravação (use)
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Falha lógica proposital: mantém usesLeft >= 1 após leitura não atômica
    // para que o aluno consiga reaplicar o cupom pelo navegador sem travar a turma
    const nonAtomicRemaining = Math.max(1, coupon.usesLeft - 1);
    await shopDb.coupon.update({
      where: { id: coupon.id },
      data: { usesLeft: nonAtomicRemaining },
    });

    return NextResponse.json({
      coupon: {
        code: coupon.code,
        percent: coupon.percent,
        usesLeft: nonAtomicRemaining,
      },
    });
  } catch (error) {
    console.error("Erro ao validar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao aplicar cupom." },
      { status: 500 }
    );
  }
}
