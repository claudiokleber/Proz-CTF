"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getShopToken } from "@/components/shop/ShopHeader";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import {
  Settings,
  DollarSign,
  Package,
  Tag,
  Users,
  Save,
  Plus,
  KeyRound,
  Crown,
} from "lucide-react";

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface AdminOrder {
  id: string;
  total: number;
  observacoes: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface AdminCoupon {
  id: string;
  code: string;
  percent: number;
  usesLeft: number;
}

export default function ShopAdminDashboardPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [flagDesafio15, setFlagDesafio15] = useState<string>("");
  const [flagDesafio17, setFlagDesafio17] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponPercent, setNewCouponPercent] = useState(15);
  const [newCouponUses, setNewCouponUses] = useState(5);

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    const token = getShopToken();
    try {
      const res = await fetch("/api/loja/admin", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Acesso restrito ao administrador da loja.");
        return;
      }

      setProducts(data.products ?? []);
      setOrders(data.orders ?? []);
      setCoupons(data.coupons ?? []);
      setFlagDesafio15(data.flagDesafio15 ?? "");
      setFlagDesafio17(data.flagDesafio17 ?? null);
      setSessionEmail(data.sessionInfo?.email ?? "");

      const initialPrices: Record<string, number> = {};
      for (const p of data.products ?? []) {
        initialPrices[p.id] = p.price;
      }
      setPriceEdits(initialPrices);
    } catch {
      setErrorMsg("Erro ao carregar painel administrativo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  async function handleSavePrice(productId: string) {
    setStatusMsg("");
    const token = getShopToken();
    const res = await fetch("/api/loja/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        action: "updateProductPrice",
        productId,
        price: priceEdits[productId],
      }),
    });
    if (res.ok) {
      setStatusMsg(`Preço do produto #${productId} atualizado com sucesso!`);
      await loadAdmin();
    }
  }

  async function handleSaveCoupon(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg("");
    const token = getShopToken();
    const res = await fetch("/api/loja/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        action: "upsertCoupon",
        code: newCouponCode,
        percent: newCouponPercent,
        usesLeft: newCouponUses,
      }),
    });
    if (res.ok) {
      setNewCouponCode("");
      setStatusMsg("Cupom criado/atualizado com sucesso!");
      await loadAdmin();
    }
  }

  function formatBRL(val: number) {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          Carregando administração da loja...
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl bg-slate-900 border border-rose-700/50 p-10 text-center space-y-3">
          <h1 className="text-xl font-bold text-rose-300">{errorMsg}</h1>
          <Link
            href="/loja/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            Fazer Login
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-slate-900 border border-rose-500/30 p-6 md:p-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <Settings className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-rose-400">
                  Administração Geral · Proz Store ({sessionEmail})
                </span>
                <h1 className="text-2xl font-bold text-white">
                  Painel Administrativo da Loja
                </h1>
              </div>
            </div>

            <Link
              href="/loja/admin/usuarios"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
            >
              <Users className="w-4 h-4 text-amber-400" />
              Gerenciar Usuários Cadastrados
            </Link>
          </div>

          {/* Flags dos Desafios 15 e 17 */}
          <div className="grid md:grid-cols-2 gap-6">
            {flagDesafio15 && (
              <div className="rounded-2xl bg-indigo-950/30 border border-indigo-500/40 p-6 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <KeyRound className="w-4 h-4" />
                  Token JWT de Admin Aceito (Desafio #15)
                </div>
                <p className="text-xs text-slate-300">
                  O middleware validou um token com <code>role: admin</code>.
                  Flag do Desafio 15:
                </p>
                <FlagCopyBadge flag={flagDesafio15} />
              </div>
            )}

            {flagDesafio17 ? (
              <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/40 p-6 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Crown className="w-4 h-4" />
                  A Chave Mestra — Controle Total (Desafio #17)
                </div>
                <p className="text-xs text-slate-300">
                  Autenticado diretamente na conta mestra{" "}
                  <code>admin@proz.com</code>! Flag Final do Desafio 17:
                </p>
                <FlagCopyBadge flag={flagDesafio17} />
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Crown className="w-4 h-4" />
                  Cofre da Conta Mestra (Desafio #17)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Você acessou o painel forjando um token JWT. Para desbloquear
                  a <strong>Chave Mestra (Desafio #17)</strong>, assuma a conta
                  real <code className="text-amber-300">admin@proz.com</code>{" "}
                  através do fluxo de recuperação de senha e faça login com ela!
                </p>
              </div>
            )}
          </div>

          {statusMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs font-semibold">
              {statusMsg}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Gerenciar Preços de Produtos */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                Alterar Preços dos Produtos
              </h2>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-mono text-slate-400">
                        #{prod.id}
                      </span>{" "}
                      <strong className="text-white">{prod.name}</strong>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        value={priceEdits[prod.id] ?? prod.price}
                        onChange={(e) =>
                          setPriceEdits((prev) => ({
                            ...prev,
                            [prod.id]: Number(e.target.value),
                          }))
                        }
                        className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePrice(prod.id)}
                        className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                        title="Salvar novo preço"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gerenciar Cupons */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                Gerenciar Cupons de Desconto
              </h2>

              <form
                onSubmit={handleSaveCoupon}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-2.5 text-xs"
              >
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) =>
                    setNewCouponCode(e.target.value.toUpperCase())
                  }
                  placeholder="CÓDIGO"
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                />
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={newCouponPercent}
                  onChange={(e) => setNewCouponPercent(Number(e.target.value))}
                  placeholder="% Desconto"
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    required
                    min={0}
                    value={newCouponUses}
                    onChange={(e) => setNewCouponUses(Number(e.target.value))}
                    placeholder="Usos"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="space-y-2 text-xs">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <span className="font-mono font-bold text-amber-300">
                      {c.code}
                    </span>
                    <span className="text-slate-300">
                      {c.percent}% OFF · Usos restantes: {c.usesLeft}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Todos os Pedidos da Loja */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              Todos os Pedidos dos Clientes ({orders.length})
            </h2>
            <div className="space-y-2.5 text-xs">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-mono font-bold text-amber-300">
                      Pedido #{ord.id}
                    </span>{" "}
                    · <strong className="text-white">{ord.user.name}</strong> (
                    {ord.user.email})
                    <div className="text-slate-400 mt-0.5">
                      Obs: {ord.observacoes}
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    {formatBRL(ord.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
