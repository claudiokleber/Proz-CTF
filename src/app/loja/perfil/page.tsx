"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getShopToken, ShopUserClient } from "@/components/shop/ShopHeader";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import { User, Package, Headphones, Settings, KeyRound } from "lucide-react";

interface ProfileUser extends ShopUserClient {
  accountFlag?: string;
}

export default function ShopProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = getShopToken();
      try {
        const res = await fetch("/api/loja/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setUser(data.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        Carregando perfil...
      </div>
    );
  }

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-300">Você não está logado na Proz Store.</p>
        <Link
          href="/loja/login"
          className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
        >
          Fazer Login
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <User className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-amber-400">
              Conta Proz Store ({user.role})
            </span>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/loja/meus-pedidos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
          >
            <Package className="w-4 h-4 text-amber-400" />
            Meus Pedidos
          </Link>

          {(user.role === "suporte" || user.role === "admin") && (
            <Link
              href="/loja/suporte"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
            >
              <Headphones className="w-4 h-4" />
              Painel de Suporte
            </Link>
          )}

          {user.role === "admin" && (
            <Link
              href="/loja/admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              <Settings className="w-4 h-4" />
              Painel Admin da Loja
            </Link>
          )}
        </div>
      </div>

      {user.accountFlag && (
        <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/40 p-6 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <KeyRound className="w-4 h-4" />
            Nota de Segurança da Conta Migrada
          </div>
          <p className="text-xs text-slate-300">
            Chave vinculada ao perfil de {user.email}:
          </p>
          <FlagCopyBadge flag={user.accountFlag} />
        </div>
      )}
    </main>
  );
}
