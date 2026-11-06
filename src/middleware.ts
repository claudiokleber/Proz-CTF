import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// PROZ CTF — Middleware de Isolamento de Containers (Platform vs Shop)
// ============================================================================
// DECISÃO DE SEGURANÇA E ARQUITETURA:
// Como o projeto sobe em 2 containers separados (`platform` na porta 3000 e `shop`
// na porta 3001), cada um conectado exclusivamente à sua própria rede de banco
// (`platform-net` e `shop-net`), este middleware garante em nível de aplicação:
// 1. O container `shop` NUNCA responde por rotas `/api/ctf/*` e redireciona links
//    de navegação `/ctf/*` para a porta da Plataforma no mesmo IP da LAN do notebook.
// 2. O container `platform` NUNCA executa rotas de API da Loja e redireciona links
//    `/loja/*` para a porta do container da Loja no mesmo IP da LAN.
// 3. Funciona 100% offline em qualquer IP de rede local (ex.: 192.168.x.x ou localhost)
//    extraindo dinamicamente o hostname do cabeçalho `Host` da requisição.

function isShopApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/loja") ||
    pathname.startsWith("/api/produtos") ||
    pathname.startsWith("/api/pedidos") ||
    pathname.startsWith("/api/checkout") ||
    pathname.startsWith("/api/cupom") ||
    pathname.startsWith("/api/chat") ||
    pathname.startsWith("/api/recuperar-senha") ||
    pathname.startsWith("/api/redefinir-senha") ||
    pathname.startsWith("/api/flag-xss") ||
    pathname.startsWith("/api/xss-log")
  );
}

function isShopPagePath(pathname: string): boolean {
  return (
    pathname === "/loja" ||
    pathname.startsWith("/loja/") ||
    pathname === "/backup-antigo" ||
    pathname.startsWith("/backup-antigo/") ||
    pathname === "/export.csv" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/produto" ||
    pathname.startsWith("/produto/") ||
    pathname === "/meus-pedidos" ||
    pathname.startsWith("/meus-pedidos/") ||
    pathname === "/redefinir-senha" ||
    pathname.startsWith("/redefinir-senha/")
  );
}

function isPlatformApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/ctf");
}

function isPlatformPagePath(pathname: string): boolean {
  return pathname === "/ctf" || pathname.startsWith("/ctf/");
}

function extractHostname(req: NextRequest): string {
  const rawHost =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.hostname ||
    "localhost";
  // Remove a porta se presente (suporta IPv4/hostname; preserva IPv6 entre colchetes)
  if (rawHost.startsWith("[")) {
    const closeBracket = rawHost.indexOf("]");
    if (closeBracket !== -1) {
      return rawHost.slice(0, closeBracket + 1);
    }
  }
  return rawHost.split(":")[0] || "localhost";
}

export function middleware(req: NextRequest) {
  const role = process.env.APP_ROLE; // "platform" | "shop" | undefined
  if (!role) {
    return NextResponse.next();
  }

  const { pathname, search } = req.nextUrl;
  const protocol = req.nextUrl.protocol || "http:";
  const hostname = extractHostname(req);
  const platformPort = process.env.PLATFORM_PORT || "3000";
  const shopPort = process.env.SHOP_PORT || "3001";

  if (role === "platform") {
    if (isShopApiPath(pathname)) {
      return NextResponse.json(
        {
          error:
            "Serviço isolado: esta rota pertence exclusivamente ao container da Loja (shop).",
        },
        { status: 404 }
      );
    }

    if (isShopPagePath(pathname)) {
      const targetUrl = `${protocol}//${hostname}:${shopPort}${pathname}${search}`;
      return NextResponse.redirect(targetUrl, 307);
    }
  }

  if (role === "shop") {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/loja";
      return NextResponse.redirect(url, 307);
    }

    if (isPlatformApiPath(pathname)) {
      return NextResponse.json(
        {
          error:
            "Acesso bloqueado: o container da Loja está estritamente isolado da Plataforma CTF.",
        },
        { status: 404 }
      );
    }

    if (isPlatformPagePath(pathname)) {
      const targetUrl = `${protocol}//${hostname}:${platformPort}${pathname}${search}`;
      return NextResponse.redirect(targetUrl, 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|produtos/).*)",
  ],
};
