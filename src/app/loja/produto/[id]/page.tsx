"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addToShopCart, getShopToken } from "@/components/shop/ShopHeader";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import {
  ShoppingCart,
  Check,
  ArrowLeft,
  MessageSquare,
  Send,
  PackageCheck,
  AlertOctagon,
} from "lucide-react";

interface ReviewItem {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  reviews: ReviewItem[];
}

interface DebugErrorPayload {
  error: string;
  debugMode: boolean;
  stackTrace: string[];
  debugEnv: Record<string, string>;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = String(params.id || "");

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [debugError, setDebugError] = useState<DebugErrorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [storedXssFlag, setStoredXssFlag] = useState<string | null>(null);
  const [reviewMsg, setReviewMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setDebugError(null);
    try {
      const res = await fetch(
        `/api/produtos/${encodeURIComponent(productId)}`,
        {
          cache: "no-store",
        }
      );
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        if (data.debugMode) {
          setDebugError(data as DebugErrorPayload);
        }
        setProduct(null);
        return;
      }
      setProduct(data.product ?? null);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  function handleAddToCart() {
    if (!product) return;
    addToShopCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  async function handlePublishReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewMsg(null);
    setSubmittingReview(true);

    const token = getShopToken();
    try {
      const res = await fetch(
        `/api/produtos/${encodeURIComponent(productId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content: reviewText }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setReviewMsg({
          type: "error",
          text: data.error || "Não foi possível publicar a avaliação.",
        });
        return;
      }

      const lowerContent = reviewText.toLowerCase();
      const hasXss =
        lowerContent.includes("<script") ||
        lowerContent.includes("onerror=") ||
        lowerContent.includes("onload=");

      setReviewText("");
      setReviewMsg({
        type: "success",
        text: "Avaliação publicada com sucesso!",
      });
      await loadProduct();

      if (hasXss) {
        const logRes = await fetch("/api/xss-log", { cache: "no-store" });
        const logData = await logRes.json();
        const firstFlag = logData?.logs?.[0]?.flag;
        if (firstFlag) {
          setStoredXssFlag(firstFlag);
        }
      }
    } catch {
      setReviewMsg({
        type: "error",
        text: "Erro de conexão ao enviar avaliação.",
      });
    } finally {
      setSubmittingReview(false);
    }
  }

  function formatBRL(val: number) {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/loja"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Catálogo
      </Link>

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          Carregando detalhes do produto...
        </div>
      ) : debugError ? (
        // ⚠️ VULN #3 — Erro demais (Renderização de tela de debug com variáveis de ambiente fictícias)
        // Exibe detalhes técnicos de exceção e variáveis internas quando `id` não é numérico.
        <div className="rounded-2xl bg-rose-950/30 border-2 border-rose-500/60 p-6 md:p-8 font-mono text-xs space-y-6">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertOctagon className="w-7 h-7 shrink-0" />
            <div>
              <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                PROZ_DEBUG_MODE = ON (HTTP 500)
              </span>
              <h1 className="text-base md:text-lg font-bold text-white mt-1">
                {debugError.error}
              </h1>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-slate-400">
            <div className="text-rose-300 font-bold mb-1">Stack Trace:</div>
            {debugError.stackTrace.map((line, i) => (
              <div key={i} className="pl-3">
                {line}
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
            <div className="text-amber-300 font-bold">
              Environment Variables Dump (Debug Context):
            </div>
            <div className="grid gap-2">
              {Object.entries(debugError.debugEnv).map(([k, v]) =>
                k.includes("FLAG") ? (
                  <FlagCopyBadge
                    key={k}
                    flag={v}
                    label={`${k} (Desafio #03):`}
                  />
                ) : (
                  <div
                    key={k}
                    className="flex flex-wrap items-center justify-between border-b border-slate-900 pb-1"
                  >
                    <span className="text-slate-400">{k}</span>
                    <span className="text-slate-200">{v}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      ) : !product ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center">
          <h1 className="text-xl font-bold text-white mb-2">
            Produto não encontrado
          </h1>
          <p className="text-sm text-slate-400">
            O item solicitado não está disponível em nosso catálogo.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Card Principal do Produto */}
          <div className="grid md:grid-cols-2 gap-8 rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-8">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[3/2]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded bg-slate-950/85 text-slate-300 font-mono text-xs border border-slate-800">
                ID #{product.id}
              </span>
            </div>

            <div className="flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded bg-slate-950 text-slate-400 font-mono text-xs border border-slate-800">
                    Código #{product.id}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                    <PackageCheck className="w-3.5 h-3.5" />
                    {product.stock} em estoque
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                  {product.name}
                </h1>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-4">
                <div>
                  <span className="block text-xs text-slate-400">
                    Preço promocional à vista
                  </span>
                  <span className="text-3xl font-extrabold text-amber-400">
                    {formatBRL(product.price)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition ${
                      added
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="w-4 h-4" />
                        Adicionado ao Carrinho!
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Adicionar ao Carrinho
                      </>
                    )}
                  </button>
                  <Link
                    href="/loja/carrinho"
                    className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition"
                  >
                    Ir para o Carrinho →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Avaliações */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                Avaliações de Clientes ({product.reviews.length})
              </h2>
            </div>

            {/* Formulário de Nova Avaliação */}
            <form
              onSubmit={handlePublishReview}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
            >
              <label className="block text-xs font-semibold text-slate-300">
                Deixe sua avaliação sobre este produto
              </label>
              {reviewMsg && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    reviewMsg.type === "success"
                      ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-200"
                      : "bg-rose-950/70 border-rose-700/60 text-rose-200"
                  }`}
                >
                  {reviewMsg.text}
                </div>
              )}
              {storedXssFlag && (
                <FlagCopyBadge
                  flag={storedXssFlag}
                  label="⚡ Simulador do Admin executou seu XSS Armazenado (/api/xss-log — Desafio #12):"
                />
              )}
              <textarea
                rows={3}
                required
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Conte o que achou da qualidade e desempenho do produto..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingReview ? "Publicando..." : "Publicar Avaliação"}
                </button>
              </div>
            </form>

            {/* Lista de Avaliações */}
            <div className="space-y-3">
              {/* ⚠️ VULN #12 — Avaliação maliciosa (XSS Armazenado / Stored XSS)
                  O conteúdo de cada avaliação (`rev.content`) é salvo no banco e renderizado
                  diretamente com `dangerouslySetInnerHTML` sem nenhuma sanitização de HTML.
                  Isso permite que um usuário injete `<script>...</script>` de forma persistente,
                  atingindo todos os visitantes da página (incluindo o administrador simulado,
                  cujo log de execução fica disponível em GET /api/xss-log).
                  Correção real: escapar o texto na renderização (JSX padrão `{rev.content}`) ou
                  sanitizar estritamente com DOMPurify no servidor antes de persistir/exibir. */}
              {product.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300">
                      {rev.user.name}
                    </span>
                    <span className="text-slate-500">
                      {new Date(rev.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div
                    className="text-sm text-slate-200 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: rev.content }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
