"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addToShopCart } from "@/components/shop/ShopHeader";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import { ShoppingCart, Check, Sparkles, Search } from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
}

function ShopCatalogContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [xssFlagResult, setXssFlagResult] = useState<string | null>(null);
  const searchReflectionRef = useRef<HTMLSpanElement | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const url = query
        ? `/api/produtos?q=${encodeURIComponent(query)}`
        : "/api/produtos";
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setProducts(data.products ?? []);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ⚠️ VULN #10 — Busca refletida (XSS Refletido no termo de pesquisa)
  // O termo `query` vindo da URL (`?q=...`) é injetado diretamente no DOM via
  // `dangerouslySetInnerHTML` sem sanitização ou escape de caracteres (`<`, `>`, `"`).
  // Além disso, tags `<script>` inseridas na busca são executadas no contexto da página.
  // Correção real: renderizar `{query}` diretamente via JSX (que escapa entidades HTML
  // automaticamente) e nunca usar `dangerouslySetInnerHTML` com entrada do usuário.
  useEffect(() => {
    setXssFlagResult(null);
    if (!query || !searchReflectionRef.current) return;

    const container = searchReflectionRef.current;
    const scripts = Array.from(container.querySelectorAll("script"));

    for (const oldScript of scripts) {
      const code = oldScript.textContent || "";
      const newScript = document.createElement("script");
      newScript.text = code;
      oldScript.parentNode?.replaceChild(newScript, oldScript);

      // Caso o script injetado pelo aluno chame fetch('/api/flag-xss') sem encadear alert(),
      // interceptamos também para exibir a flag claramente na tela como feedback visual.
      if (code.includes("/api/flag-xss")) {
        fetch("/api/flag-xss")
          .then((r) => r.json())
          .then((d) => {
            if (d?.flag) {
              setXssFlagResult(d.flag);
            }
          })
          .catch(() => {});
      }
    }
  }, [query]);

  function handleAdd(prod: ProductItem) {
    addToShopCart(prod);
    setAddedId(prod.id);
    setTimeout(() => setAddedId(null), 1500);
  }

  function formatBRL(val: number) {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Banner */}
      {!query && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-950 border border-amber-500/30 p-8 md:p-10 mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Ofertas Especiais de Semestre
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
              Equipamentos de Alta Performance para seus Estudos e Projetos
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Notebooks, periféricos mecânicos, redes Wi-Fi 6E e hardware
              selecionado. Aproveite 10% OFF com o cupom{" "}
              <code className="text-amber-300 font-mono font-bold">
                BEMVINDO10
              </code>
              .
            </p>
          </div>
          <Link
            href="/loja/sobre"
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shrink-0 transition"
          >
            Conheça Nossa História →
          </Link>
        </div>
      )}

      {/* Resultados para busca — ⚠️ VULN #10: dangerouslySetInnerHTML sem escapar */}
      {query && (
        <div className="mb-8 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  Resultados da busca por:{" "}
                  <span
                    ref={searchReflectionRef}
                    className="text-amber-300"
                    dangerouslySetInnerHTML={{ __html: query }}
                  />
                </h2>
                <p className="text-xs text-slate-400">
                  {products.length} produto(s) encontrado(s)
                </p>
              </div>
            </div>
            <Link
              href="/loja"
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              Limpar busca
            </Link>
          </div>

          {xssFlagResult && (
            <FlagCopyBadge
              flag={xssFlagResult}
              label="Payload XSS Refletido executado com sucesso (/api/flag-xss):"
            />
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          Carregando catálogo de produtos...
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400">
          Nenhum produto encontrado para o termo pesquisado.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition group"
            >
              <div>
                <Link
                  href={`/loja/produto/${prod.id}`}
                  className="block relative h-48 bg-slate-950 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-950/85 text-slate-300 font-mono text-[10px] border border-slate-800">
                    ID #{prod.id}
                  </span>
                </Link>

                <div className="p-5">
                  <Link href={`/loja/produto/${prod.id}`}>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-1">
                      {prod.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <div>
                  <span className="block text-[10px] text-slate-400">
                    À vista no PIX ou Cartão
                  </span>
                  <span className="text-lg font-extrabold text-amber-400">
                    {formatBRL(prod.price)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/loja/produto/${prod.id}`}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    Detalhes
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleAdd(prod)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      addedId === prod.id
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    }`}
                  >
                    {addedId === prod.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Adicionado
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Comprar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ShopCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 text-slate-400">
          Carregando loja...
        </div>
      }
    >
      <ShopCatalogContent />
    </Suspense>
  );
}
