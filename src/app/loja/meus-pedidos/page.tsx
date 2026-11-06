"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getShopToken } from "@/components/shop/ShopHeader";
import { Package, ChevronRight } from "lucide-react";

interface OrderSummary {
  id: string;
  total: number;
  observacoes: string | null;
  createdAt: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      const token = getShopToken();
      try {
        const res = await fetch("/api/pedidos", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Faça login para ver seus pedidos.");
          return;
        }
        setOrders(data.orders ?? []);
      } catch {
        setErrorMsg("Erro ao carregar pedidos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatBRL(val: number) {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5 mb-8">
        <Package className="w-7 h-7 text-amber-400" />
        Meus Pedidos
      </h1>

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          Carregando histórico de pedidos...
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center space-y-4">
          <p className="text-sm text-rose-300">{errorMsg}</p>
          <Link
            href="/loja/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            Entrar na Conta
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center text-slate-400 text-sm">
          Você ainda não realizou nenhum pedido.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <Link
              key={ord.id}
              href={`/loja/meus-pedidos/${ord.id}`}
              className="block rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-5 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800 font-bold">
                    Pedido #{ord.id}
                  </span>
                  <div className="text-xs text-slate-400 mt-1.5">
                    Realizado em{" "}
                    {new Date(ord.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                    {Array.isArray(ord.items) ? ord.items.length : 0} item(ns)
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400">
                      Total do Pedido
                    </span>
                    <span className="text-lg font-extrabold text-emerald-400">
                      {formatBRL(ord.total)}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
