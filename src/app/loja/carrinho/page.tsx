"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CartItem,
  getShopCart,
  getShopToken,
  saveShopCart,
} from "@/components/shop/ShopHeader";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import {
  ShoppingCart,
  Trash2,
  Tag,
  CheckCircle2,
  CreditCard,
  ArrowLeft,
  X,
} from "lucide-react";

export default function ShopCartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    percent: number;
  } | null>(null);
  const [appliedCouponTimes, setAppliedCouponTimes] = useState(0);
  const [accumulatedDiscountRatio, setAccumulatedDiscountRatio] = useState(0);
  const [couponMsg, setCouponMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<{
    id: string;
    total: number;
    flag?: string;
  } | null>(null);

  useEffect(() => {
    setItems(getShopCart());
  }, []);

  function updateQty(productId: string, delta: number) {
    const updated = items
      .map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
      .filter((item) => item.quantity > 0);
    setItems(updated);
    saveShopCart(updated);
  }

  function removeItem(productId: string) {
    const updated = items.filter((item) => item.productId !== productId);
    setItems(updated);
    saveShopCart(updated);
  }

  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // ⚠️ VULN #13 — O desconto acumulado não é zerado quando o cupom é removido/reaplicado
  // ou aplicado repetidamente, permitindo reduzir o valor total para menos de 10% do subtotal.
  const effectiveRatio = Math.min(0.95, accumulatedDiscountRatio);
  const discountAmount = Number((subtotal * effectiveRatio).toFixed(2));
  const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCouponMsg(null);
    try {
      const res = await fetch("/api/cupom/aplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, currentTotal: total }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponMsg({
          type: "error",
          text: data.error || "Cupom inválido.",
        });
        return;
      }

      const nextTimes = appliedCouponTimes + 1;
      const stepRatio = Number(data.coupon.percent) / 100;
      const nextRatio = Math.min(0.95, accumulatedDiscountRatio + stepRatio);

      setAppliedCoupon({
        code: data.coupon.code,
        percent: data.coupon.percent,
      });
      setAppliedCouponTimes(nextTimes);
      setAccumulatedDiscountRatio(nextRatio);
      setCouponMsg({
        type: "success",
        text: `Cupom ${data.coupon.code} aplicado (${nextTimes}x · -${Math.round(
          nextRatio * 100
        )}% acumulado)!`,
      });
    } catch {
      setCouponMsg({ type: "error", text: "Erro ao validar cupom." });
    }
  }

  function handleDetachCouponBadge() {
    // ⚠️ VULN #13 — Remove apenas o rótulo visual do cupom sem restaurar o preço original,
    // permitindo que o usuário clique em "Remover" e aplique o mesmo cupom novamente!
    setAppliedCoupon(null);
    setCouponMsg({
      type: "success",
      text: "Rótulo do cupom removido. Você pode digitar e aplicar um cupom novamente.",
    });
  }

  async function handleCheckout() {
    setCheckoutError("");
    setSubmitting(true);
    const token = getShopToken();

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
          subtotal,
          total,
          couponCode: appliedCoupon?.code || (appliedCouponTimes > 0 ? "BEMVINDO10" : ""),
          appliedCouponTimes,
          observacoes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(
          data.error || "Não foi possível concluir o pagamento."
        );
        return;
      }

      saveShopCart([]);
      setItems([]);
      setCreatedOrder({
        id: data.order.id,
        total: data.order.total,
        flag: data.flag,
      });
    } catch {
      setCheckoutError("Erro de conexão ao processar checkout.");
    } finally {
      setSubmitting(false);
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
        Continuar Comprando
      </Link>

      <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5 mb-8">
        <ShoppingCart className="w-7 h-7 text-amber-400" />
        Meu Carrinho & Checkout
      </h1>

      {createdOrder ? (
        <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/40 p-8 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Pedido #{createdOrder.id} Confirmado!
          </h2>
          <p className="text-sm text-slate-300">
            Total faturado:{" "}
            <strong className="text-emerald-400">
              {formatBRL(createdOrder.total)}
            </strong>
          </p>
          {createdOrder.flag && (
            <div className="max-w-lg mx-auto text-left">
              <FlagCopyBadge
                flag={createdOrder.flag}
                label="🎉 Flag desbloqueada no pedido:"
              />
            </div>
          )}
          <div className="pt-4 flex justify-center gap-3">
            <Link
              href={`/loja/meus-pedidos/${createdOrder.id}`}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              Ver Detalhes do Pedido
            </Link>
            <Link
              href="/loja"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Voltar ao Catálogo
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center space-y-4">
          <p className="text-slate-400 text-sm">
            Seu carrinho de compras está vazio.
          </p>
          <Link
            href="/loja"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
          >
            Explorar Produtos
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Lista de Itens */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-800"
                  />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {item.name}
                    </h3>
                    <div className="text-xs text-amber-400 font-semibold mt-0.5">
                      {formatBRL(item.price)} cada
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-700 rounded-xl bg-slate-950">
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, -1)}
                      className="px-3 py-1 text-slate-300 hover:text-white font-bold"
                    >
                      -
                    </button>
                    <span className="px-2 text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, 1)}
                      className="px-3 py-1 text-slate-300 hover:text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Observações do pedido */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Observações de Entrega (opcional)
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: Entregar na recepção em horário comercial"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Resumo e Cupom */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
                Resumo do Pedido
              </h2>

              {/* Cupom */}
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Cupom de Desconto
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
                    placeholder="BEMVINDO10"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700"
                  >
                    Aplicar
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-xs">
                    <span className="font-mono font-bold">
                      {appliedCoupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleDetachCouponBadge}
                      title="Remover cupom"
                      className="hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {couponMsg && (
                  <p
                    className={`text-[11px] ${
                      couponMsg.type === "success"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {couponMsg.text}
                  </p>
                )}
              </form>

              <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>
                      Desconto acumulado ({appliedCouponTimes}x · -
                      {Math.round(effectiveRatio * 100)}%)
                    </span>
                    <span>-{formatBRL(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                  <span>Total a Pagar</span>
                  <span className="text-amber-400">{formatBRL(total)}</span>
                </div>
              </div>

              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs">
                  {checkoutError}
                </div>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2 transition"
              >
                <CreditCard className="w-4 h-4" />
                {submitting ? "Processando..." : "Finalizar Compra"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
