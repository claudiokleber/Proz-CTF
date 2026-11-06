"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, CheckCircle2 } from "lucide-react";

function extractResetToken(raw: string): string {
  const match = raw.match(/reset_[a-zA-Z0-9_]+/);
  return match ? match[0] : raw;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setDoneMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Não foi possível redefinir a senha.");
        return;
      }

      setDoneMsg(data.message || "Senha redefinida com sucesso!");
    } catch {
      setErrorMsg("Erro de conexão ao redefinir senha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-2.5 text-amber-400 font-bold text-lg">
          <KeyRound className="w-5 h-5" />
          Redefinir Senha da Conta
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs">
            {errorMsg}
          </div>
        )}

        {doneMsg ? (
          <div className="p-5 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm text-emerald-200 font-medium">{doneMsg}</p>
            <Link
              href="/loja/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Ir para o Login →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Token de Recuperação
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) =>
                  setToken(
                    e.target.value.includes("reset_")
                      ? extractResetToken(e.target.value)
                      : e.target.value
                  )
                }
                placeholder="Informe o token gerado (ou cole o JSON do F12)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nova Senha
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition"
            >
              {submitting ? "Salvando..." : "Confirmar Nova Senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ShopResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
