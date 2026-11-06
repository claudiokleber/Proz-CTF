"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getShopToken } from "@/components/shop/ShopHeader";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import { Users, ArrowLeft, KeyRound } from "lucide-react";

interface ShopUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function ShopAdminUsersPage() {
  const [users, setUsers] = useState<ShopUserRow[]>([]);
  const [flagDesafio14, setFlagDesafio14] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      const token = getShopToken();
      try {
        // ⚠️ VULN #14 — Consulta endpoint que não valida `role === "admin"` no servidor
        const res = await fetch("/api/loja/usuarios", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Acesso restrito.");
          return;
        }
        setUsers(data.users ?? []);
        setFlagDesafio14(data.flagDesafio14 ?? "");
      } catch {
        setErrorMsg("Erro de conexão.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link
        href="/loja/suporte"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Painel
      </Link>

      <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
        <Users className="w-6 h-6 text-amber-400" />
        Diretório Restrito de Usuários da Loja (/admin/usuarios)
      </h1>

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          Carregando lista de usuários...
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl bg-slate-900 border border-rose-700/50 p-10 text-center text-rose-300 text-sm">
          {errorMsg}
        </div>
      ) : (
        <div className="space-y-6">
          {flagDesafio14 && (
            <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/40 p-6 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                Auditoria de Controle de Acesso — Área Restrita (Desafio #14)
              </div>
              <p className="text-xs text-slate-300">
                Você acessou uma rota administrativa oculta sem verificação de
                papel no servidor. Flag capturada:
              </p>
              <FlagCopyBadge flag={flagDesafio14} />
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Nome</th>
                  <th className="py-3.5 px-4">E-mail Corporativo</th>
                  <th className="py-3.5 px-4">Papel (Role)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {u.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {u.email}
                    </td>
                    <td className="py-3 px-4 uppercase font-bold text-slate-300">
                      {u.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
