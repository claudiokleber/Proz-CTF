import crypto from "crypto";
import { NextRequest } from "next/server";
import { shopDb } from "./db-shop";

// ⚠️ VULN #15 — Token de admin (Segredo JWT fraco e validação falha de assinatura)
// 1. O segredo usado para assinar o JWT da loja é fixo e fraco ("proz123").
// 2. A função `verifyShopJwt` aceita tokens com `alg: "none"` (sem assinatura) e
//    também aceita payloads decodificados mesmo quando a assinatura não confere,
//    confiando cegamente no campo `role` enviado pelo cliente no `localStorage`.
// Correção real:
// - Armazenar o token em cookie `HttpOnly`, `Secure`, `SameSite=Strict`;
// - Exigir algoritmo fixo (`algorithms: ["HS256"]`), rejeitando `alg: "none"`;
// - Usar segredo forte de no mínimo 256 bits via variável de ambiente;
// - Sempre rejeitar tokens cuja assinatura HMAC seja inválida e revalidar permissões críticas no banco.
const SHOP_JWT_WEAK_SECRET = "proz123";

export interface ShopJwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string; // "cliente" | "suporte" | "admin"
  iat: number;
  exp: number;
  forgedJwt?: boolean;
}

function base64UrlEncode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function base64UrlDecode<T>(str: string): T | null {
  try {
    const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad =
      normalized.length % 4 === 0
        ? ""
        : "=".repeat(4 - (normalized.length % 4));
    return JSON.parse(
      Buffer.from(normalized + pad, "base64").toString("utf-8")
    ) as T;
  } catch {
    return null;
  }
}

export function signShopJwt(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: ShopJwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + 60 * 60 * 12,
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", SHOP_JWT_WEAK_SECRET)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

export function verifyShopJwt(token: string): ShopJwtPayload | null {
  try {
    // ⚠️ VULN #15 — Token de admin (Validação falha de JWT: aceita `alg: none` e payload adulterado)
    // Permite que o aluno copie o token do `localStorage` (`proz_shop_token`), decodifique
    // em jwt.io ou no Console do navegador, altere `"role": "cliente"` para `"role": "admin"`
    // (usando `alg: "none"` ou colando o payload editado de volta) e ganhe acesso ao painel `/loja/admin`.
    const parts = token.split(".");
    if (parts.length < 2 || parts.length > 3) return null;

    const [encodedHeader, encodedPayload, signature = ""] = parts;
    const header = base64UrlDecode<{ alg?: string }>(encodedHeader);
    const payload = base64UrlDecode<ShopJwtPayload>(encodedPayload);

    if (!header || !payload || !payload.sub) return null;

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const validSignature = crypto
      .createHmac("sha256", SHOP_JWT_WEAK_SECRET)
      .update(signingInput)
      .digest("base64url");

    const algLower = String(header.alg || "").toLowerCase();
    const isAlgNone = algLower === "none";
    const isSignatureValid = signature === validSignature;

    return {
      ...payload,
      forgedJwt: isAlgNone || !isSignatureValid,
    };
  } catch {
    return null;
  }
}

export function extractShopTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = req.cookies.get("proz_shop_token")?.value;
  if (cookieToken) return cookieToken;
  return null;
}

export async function getShopSessionFromRequest(
  req: NextRequest
): Promise<ShopJwtPayload | null> {
  const token = extractShopTokenFromRequest(req);
  if (!token) return null;
  return verifyShopJwt(token);
}

export async function getShopFlag(challengeNumber: number): Promise<string> {
  try {
    const row = await shopDb.shopChallengeFlag.findUnique({
      where: { challengeNumber },
    });
    return row?.flag ?? `CTF{proz_flag_${challengeNumber}_nao_semeada}`;
  } catch (err) {
    console.error(`Erro ao buscar flag #${challengeNumber} no banco shop:`, err);
    return `CTF{proz_flag_${challengeNumber}_erro_db}`;
  }
}

export function parseOrderItems(rawItems: unknown): Array<{
  productId: string;
  name: string;
  quantity: number;
  price: number;
}> {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === "string") {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
