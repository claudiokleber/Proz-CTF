import { NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";
import { getShopFlag } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

interface XssLogEntry {
  reviewId: string;
  productId: string;
  productName: string;
  authorName: string;
  payloadDetected: string;
  executedInAdminContextAt: string;
  adminCookieCaptured: string;
  flag: string;
}

const globalForXssBot = globalThis as unknown as {
  xssAdminLog: Map<string, XssLogEntry>;
  xssBotIntervalStarted?: boolean;
};

if (!globalForXssBot.xssAdminLog) {
  globalForXssBot.xssAdminLog = new Map<string, XssLogEntry>();
}

/**
 * ⚠️ VULN #12 — Avaliação maliciosa (Simulador de visita periódica do Admin / Stored XSS)
 * Verifica as avaliações mais recentes dos produtos no banco `shop`. Se alguma avaliação
 * contiver uma tag `<script>` (ou handler HTML malicioso como `onerror=` / `onload=`),
 * simula a execução do JavaScript no navegador do administrador da loja e registra a
 * entrada com a flag do Desafio 12 no log de auditoria `/api/xss-log`.
 */
async function scanRecentReviewsForStoredXss() {
  try {
    const recentReviews = await shopDb.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { name: true } },
      },
    });

    const flagDesafio12 = await getShopFlag(12);

    for (const rev of recentReviews) {
      const lower = rev.content.toLowerCase();
      const hasScriptPayload =
        lower.includes("<script") ||
        lower.includes("onerror=") ||
        lower.includes("onload=") ||
        lower.includes("javascript:");

      if (hasScriptPayload && !globalForXssBot.xssAdminLog.has(rev.id)) {
        globalForXssBot.xssAdminLog.set(rev.id, {
          reviewId: rev.id,
          productId: rev.product.id,
          productName: rev.product.name,
          authorName: rev.user.name,
          payloadDetected: rev.content,
          executedInAdminContextAt: new Date().toISOString(),
          adminCookieCaptured: `proz_admin_monitor=active; flag=${flagDesafio12}`,
          flag: flagDesafio12,
        });
      }
    }
  } catch {
    // Ignora erros transitórios caso o banco ainda não esteja populado
  }
}

// Inicia a rotina periódica (setInterval) simulando a visita do admin às avaliações
if (!globalForXssBot.xssBotIntervalStarted) {
  globalForXssBot.xssBotIntervalStarted = true;
  setInterval(() => {
    scanRecentReviewsForStoredXss();
  }, 5000);
}

export async function GET() {
  await scanRecentReviewsForStoredXss();

  const entries = Array.from(globalForXssBot.xssAdminLog.values()).reverse();

  return NextResponse.json({
    monitor: "Proz Store — Simulador de Navegador do Administrador (Stored XSS Log)",
    totalExecutions: entries.length,
    instruction:
      entries.length === 0
        ? "Nenhuma execução de XSS armazenado detectada ainda. Publique uma avaliação com <script>...</script> em um produto e recarregue este endpoint."
        : "Payload XSS armazenado executado no contexto do administrador!",
    logs: entries,
  });
}
