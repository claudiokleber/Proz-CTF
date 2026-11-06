import { NextRequest, NextResponse } from "next/server";
import { getShopFlag } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ⚠️ VULN #10 — Busca refletida (Endpoint auxiliar para prova de execução de XSS Refletido)
  // Quando o script injetado pelo aluno no parâmetro de busca `?q=` é executado no
  // navegador e faz uma requisição `fetch('/api/flag-xss')`, este endpoint devolve
  // a flag do Desafio 10.
  // Correção real: escapar todo conteúdo dinâmico antes de renderizar no HTML (o que
  // o React já faz por padrão quando NÃO se utiliza `dangerouslySetInnerHTML`) e
  // configurar uma política de Content-Security-Policy (CSP) restritiva.
  const referer = req.headers.get("referer") || "";
  const secFetchSite = req.headers.get("sec-fetch-site") || "";

  const flagDesafio10 = await getShopFlag(10);

  return NextResponse.json({
    ok: true,
    vulnerability: "Reflected XSS Executed",
    referer,
    secFetchSite,
    flag: flagDesafio10,
  });
}
