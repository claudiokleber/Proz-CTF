"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getShopToken, ShopUserClient } from "@/components/shop/ShopHeader";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import { Headphones, CheckCircle2, Clock, KeyRound } from "lucide-react";

export default function ShopSupportPage() {
  const [user, setUser] = useState<ShopUserClient | null>(null);
  const [flagDesafio9, setFlagDesafio9] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = getShopToken();
      try {
        const res = await fetch("/api/loja/suporte", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setUser(data.user ?? null);
        setFlagDesafio9(data.flagDesafio9 ?? "");
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
        Carregando central de suporte...
      </div>
    );
  }

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-rose-300">Acesso Restrito</h1>
        <p className="text-xs text-slate-400">
          Esta área é exclusiva para atendentes de suporte da Proz Store.
        </p>
        <Link
          href="/loja/login"
          className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
        >
          Fazer Login como Suporte
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="rounded-2xl bg-slate-900 border border-cyan-500/30 p-6 md:p-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Headphones className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-cyan-400">
              Central Interna de Atendimento
            </span>
            <h1 className="text-2xl font-bold text-white">
              Painel do Atendente ({user.name})
            </h1>
          </div>
        </div>

        {/* Menu do Painel de Suporte */}
        <nav className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30">
            Chamados Ativos
          </span>

          {/* ⚠️ VULN #14 — Área restrita (Controle de acesso apenas visual via CSS)
              O link para a rota administrativa /admin/usuarios está oculto na tela
              usando `style={{ display: "none" }}`, mas continua presente no DOM para
              qualquer usuário logado no suporte que inspecione o elemento (F12).
              Se o aluno desmarcar `display: none` no F12, o botão aparece na tela!
              Correção real: não renderizar links administrativos para perfis sem
              permissão e, principalmente, validar `session.role === "admin"` no servidor. */}
          <a
            href="/admin/usuarios"
            style={{ display: "none" }}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 hover:bg-rose-500/30 transition"
            data-admin-menu="restricted-users-link"
          >
            🔒 Gerenciar Usuários (Restrito Admin) — /admin/usuarios
          </a>
        </nav>
      </div>

      {/* ⚠️ VULN #9 — Exibe a flag do Desafio 9 após login com a senha adivinhável `proz2010` */}
      {flagDesafio9 && (
        <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/40 p-6 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <KeyRound className="w-4 h-4" />
            Credencial Interna do Painel de Suporte (Desafio #09)
          </div>
          <p className="text-xs text-slate-300">
            Bem-vindo à bancada de suporte! Seu código de verificação de turno é:
          </p>
          <FlagCopyBadge flag={flagDesafio9} />
        </div>
      )}

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">
          Chamados Recentes de Clientes
        </h2>
        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">
                #TK-101 · Dúvida sobre prazo de entrega expressa
              </div>
              <div className="text-slate-400">
                Cliente: maria.silva@proz.com
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">
                #TK-102 · Solicitação de nota fiscal segunda via
              </div>
              <div className="text-slate-400">Cliente: joao.lima@proz.com</div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold">
              <Clock className="w-3.5 h-3.5" /> Em atendimento
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
