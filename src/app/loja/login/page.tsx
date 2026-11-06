"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, KeyRound, Mail } from "lucide-react";

export default function ShopLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  async function handleLoginOrRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setSubmitting(true);

    try {
      const endpoint =
        tab === "login" ? "/api/loja/auth/login" : "/api/loja/auth/register";
      const payload =
        tab === "login" ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Falha na autenticação.");
        return;
      }

      if (data.token) {
        localStorage.setItem("proz_shop_token", data.token);
      }
      window.dispatchEvent(new Event("proz-auth-updated"));
      router.push("/loja/perfil");
    } catch {
      setErrorMsg("Erro de conexão com o servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Erro ao solicitar recuperação.");
        return;
      }

      setInfoMsg(
        data.message ||
          "Solicitação processada! Caso possua um token de recuperação, acesse a página de redefinição."
      );
    } catch {
      setErrorMsg("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMsg("");
              setInfoMsg("");
            }}
            className={`py-2 rounded-lg transition ${
              tab === "login"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setErrorMsg("");
              setInfoMsg("");
            }}
            className={`py-2 rounded-lg transition ${
              tab === "register"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Criar Conta
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("forgot");
              setErrorMsg("");
              setInfoMsg("");
            }}
            className={`py-2 rounded-lg transition ${
              tab === "forgot"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Recuperar Senha
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs space-y-2">
            <p>{infoMsg}</p>
            <Link
              href="/loja/redefinir-senha"
              className="inline-block font-bold text-amber-300 underline"
            >
              Ir para Redefinir Senha com Token →
            </Link>
          </div>
        )}

        {tab === "forgot" ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold mb-2">
              <KeyRound className="w-4 h-4" />
              Esqueci minha senha
            </div>
            <p className="text-xs text-slate-400">
              Informe o e-mail da sua conta na Proz Store para gerar um token de
              redefinição de senha.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                E-mail da conta
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@proz.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
            >
              {submitting ? "Solicitando..." : "Solicitar Token de Recuperação"}
            </button>
            <div className="text-center pt-2">
              <Link
                href="/loja/redefinir-senha"
                className="text-xs text-slate-400 hover:text-amber-300 underline"
              >
                Já tenho um token de recuperação
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLoginOrRegister} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao.lima@proz.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition"
            >
              {submitting
                ? "Autenticando..."
                : tab === "login"
                ? "Entrar na Proz Store"
                : "Criar Conta de Cliente"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
