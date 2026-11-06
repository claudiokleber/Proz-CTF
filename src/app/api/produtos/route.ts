import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const qLower = q.toLowerCase();

    // ⚠️ VULN #8 — API tagarela (Excessive Data Exposure / Falta de DTO de saída)
    // O endpoint retorna o objeto `Product` completo vindo do banco de dados, incluindo
    // os campos sensíveis `custoInterno` e `notaFornecedor` (onde está a flag do Desafio 8
    // no produto #8), além de expor o e-mail administrativo em `contatoSuporte`.
    // Embora o front-end exiba apenas nome, descrição, imagem e preço na tela, qualquer
    // usuário que inspecione a aba Network (F12) vê todos os dados internos no JSON.
    // Correção real: sempre usar um DTO (Data Transfer Object) ou `select` explícito no
    // Prisma contendo apenas os campos públicos estritamente necessários para a tela.
    const allProducts = await shopDb.product.findMany();

    const filtered = qLower
      ? allProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(qLower) ||
            p.description.toLowerCase().includes(qLower)
        )
      : allProducts;

    const sorted = [...filtered].sort((a, b) => Number(a.id) - Number(b.id));

    return NextResponse.json({
      configuracaoPublica: {
        loja: "Proz Store",
        versaoApi: "1.4.2-legacy",
        // ⚠️ VULN #8 / #17 — Vaza o e-mail do administrador usado na cadeia do Desafio 17
        contatoSuporte: "admin@proz.com",
      },
      products: sorted.map((p) => ({
        ...p,
        price: Number(p.price),
        custoInterno: Number(p.custoInterno),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    return NextResponse.json(
      { error: "Erro ao carregar catálogo de produtos.", products: [] },
      { status: 500 }
    );
  }
}
