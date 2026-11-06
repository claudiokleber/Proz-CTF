"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getShopToken } from "@/components/shop/ShopHeader";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import { findFlagsInText } from "@/lib/clipboard";
import { Package, ArrowLeft, FileText, User } from "lucide-react";

interface OrderDetail {
  id: string;
  userId: string;
  total: number;
  observacoes: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = String(params.id || "");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      const token = getShopToken();
      try {
        const res = await fetch(
          `/api/pedidos/${encodeURIComponent(orderId)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: "no-store",
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Não foi possível carregar o pedido.");
          return;
        }
        setOrder(data.order ?? null);
      } catch {
        setErrorMsg("Erro de conexão.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId]);

  function formatBRL(val: number) {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link
        href="/loja/meus-pedidos"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Meus Pedidos
      </Link>

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          Carregando detalhes do pedido #{orderId}...
        </div>
      ) : errorMsg || !order ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center space-y-3">
          <h1 className="text-xl font-bold text-rose-300">
            {errorMsg || "Pedido não encontrado"}
          </h1>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Pedido #{order.id}
                </h1>
                <p className="text-xs text-slate-400">
                  Emitido em {new Date(order.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-xs text-slate-400">Valor Total</span>
              <span className="text-2xl font-extrabold text-emerald-400">
                {formatBRL(order.total)}
              </span>
            </div>
          </div>

          {order.user && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs">
              <User className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-slate-400">Cliente: </span>
                <strong className="text-white">{order.user.name}</strong> (
                <span className="text-slate-300">{order.user.email}</span>)
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-slate-300 mb-3">
              Itens do Pedido
            </h2>
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              {(Array.isArray(order.items) ? order.items : []).map(
                (item, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-slate-400">
                        Quantidade: {item.quantity} · Unitário:{" "}
                        {formatBRL(Number(item.price))}
                      </div>
                    </div>
                    <div className="font-bold text-amber-300">
                      {formatBRL(Number(item.price) * Number(item.quantity))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              Observações e Instruções de Entrega
            </div>
            <p className="text-xs text-slate-200 font-mono leading-relaxed">
              {order.observacoes || "Sem observações adicionais."}
            </p>
            {findFlagsInText(order.observacoes || "").map((fl) => (
              <FlagCopyBadge
                key={fl}
                flag={fl}
                label="Flag encontrada nas observações do pedido:"
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
