"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CtfNavbar, { PlatformUserClient } from "@/components/ctf/CtfNavbar";
import { copyTextSafe } from "@/lib/clipboard";
import {
  Users,
  UserPlus,
  KeyRound,
  Copy,
  Check,
  Flag,
  Trophy,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export default function CtfHomePage() {
  const [user, setUser] = useState<PlatformUserClient | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [eventoAtivo, setEventoAtivo] = useState(true);
  const [loading, setLoading] = useState(true);

  // Auth form state
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Team form state
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [teamMessage, setTeamMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ctf/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
      setTeamMembers(data.teamMembers ?? []);
      setEventoAtivo(data.eventoAtivo ?? true);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);

    try {
      const endpoint =
        authTab === "login" ? "/api/ctf/auth/login" : "/api/ctf/auth/register";
      const payload =
        authTab === "login" ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Falha na autenticação.");
        return;
      }

      setName("");
      setEmail("");
      setPassword("");
      await loadSession();
    } catch {
      setAuthError("Erro de conexão com o servidor.");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setTeamMessage(null);
    setTeamSubmitting(true);
    try {
      const res = await fetch("/api/ctf/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newTeamName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTeamMessage({
          type: "error",
          text: data.error || "Não foi possível criar a equipe.",
        });
        return;
      }
      setNewTeamName("");
      setTeamMessage({
        type: "success",
        text: `Equipe "${data.team.name}" criada! Código de convite: ${data.team.inviteCode}`,
      });
      await loadSession();
    } catch {
      setTeamMessage({ type: "error", text: "Erro de conexão." });
    } finally {
      setTeamSubmitting(false);
    }
  }

  async function handleJoinTeam(e: React.FormEvent) {
    e.preventDefault();
    setTeamMessage(null);
    setTeamSubmitting(true);
    try {
      const res = await fetch("/api/ctf/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", inviteCode: inviteCodeInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTeamMessage({
          type: "error",
          text: data.error || "Não foi possível entrar na equipe.",
        });
        return;
      }
      setInviteCodeInput("");
      setTeamMessage({
        type: "success",
        text: `Você entrou na equipe "${data.team.name}"!`,
      });
      await loadSession();
    } catch {
      setTeamMessage({ type: "error", text: "Erro de conexão." });
    } finally {
      setTeamSubmitting(false);
    }
  }

  async function handleLeaveTeam() {
    if (!confirm("Deseja realmente sair da sua equipe atual?")) return;
    setTeamSubmitting(true);
    try {
      await fetch("/api/ctf/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      await loadSession();
    } finally {
      setTeamSubmitting(false);
    }
  }

  async function copyInviteCode(code: string) {
    await copyTextSafe(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <CtfNavbar
        user={user}
        eventoAtivo={eventoAtivo}
        onLogout={() => setUser(null)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            Carregando sessão da Plataforma CTF...
          </div>
        ) : !user ? (
          /* Card de Login / Cadastro */
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Plataforma de Equipes — Proz CTF
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Entre com sua conta ou cadastre-se para participar da competição
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("login");
                    setAuthError("");
                  }}
                  className={`py-2 rounded-lg text-sm font-semibold transition ${
                    authTab === "login"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("register");
                    setAuthError("");
                  }}
                  className={`py-2 rounded-lg text-sm font-semibold transition ${
                    authTab === "register"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Cadastrar Aluno
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authTab === "register" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex.: Ana Souza"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.nome@aluno.proz.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition"
                >
                  {authSubmitting
                    ? "Processando..."
                    : authTab === "login"
                    ? "Acessar Plataforma"
                    : "Criar Conta e Continuar"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Painel do Aluno / Equipe */
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Olá, {user.name}!
                </h1>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/ctf/desafios"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
                >
                  <Flag className="w-4 h-4" />
                  Ir para os 17 Desafios
                </Link>
                <Link
                  href="/ctf/placar"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Ver Placar
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/ctf/admin"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition"
                  >
                    <Settings className="w-4 h-4" />
                    Painel Admin
                  </Link>
                )}
              </div>
            </div>

            {teamMessage && (
              <div
                className={`p-4 rounded-xl text-sm border ${
                  teamMessage.type === "success"
                    ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-200"
                    : "bg-rose-950/70 border-rose-700/60 text-rose-200"
                }`}
              >
                {teamMessage.text}
              </div>
            )}

            {user.team ? (
              /* Card da Equipe Atual */
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      <Users className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                        Sua Equipe Ativa
                      </span>
                      <h2 className="text-2xl font-bold text-white">
                        {user.team.name}
                      </h2>
                    </div>
                  </div>

                  {/* Código de convite */}
                  <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl">
                    <div>
                      <div className="text-[11px] text-slate-400">
                        Código de Convite da Equipe
                      </div>
                      <div className="font-mono font-bold text-emerald-300 text-sm tracking-wider">
                        {user.team.inviteCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyInviteCode(user.team!.inviteCode)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      title="Copiar código de convite"
                    >
                      {copiedCode ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Lista de Integrantes */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    Integrantes da Equipe ({teamMembers.length})
                  </h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium text-white">
                            {member.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {member.email}
                          </div>
                        </div>
                        {member.id === user.id && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Você
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Compartilhe o código{" "}
                    <code className="text-emerald-300 font-mono">
                      {user.team.inviteCode}
                    </code>{" "}
                    com seus colegas para que entrem na mesma equipe.
                  </p>
                  <button
                    type="button"
                    disabled={teamSubmitting}
                    onClick={handleLeaveTeam}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-medium transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair da equipe
                  </button>
                </div>
              </div>
            ) : (
              /* Criar ou Entrar em Equipe */
              <div className="grid md:grid-cols-2 gap-6">
                {/* Card Criar Equipe */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Criar Nova Equipe
                      </h2>
                      <p className="text-xs text-slate-400">
                        Gera um código de convite exclusivo para seu grupo
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateTeam} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Nome da Equipe
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={40}
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Ex.: Esquadrão CyberProz"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={teamSubmitting}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition"
                    >
                      Criar Equipe
                    </button>
                  </form>
                </div>

                {/* Card Entrar com Código */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Entrar com Código de Convite
                      </h2>
                      <p className="text-xs text-slate-400">
                        Use o código gerado pelo colega que criou a equipe
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleJoinTeam} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Código de Convite
                      </label>
                      <input
                        type="text"
                        required
                        value={inviteCodeInput}
                        onChange={(e) =>
                          setInviteCodeInput(e.target.value.toUpperCase())
                        }
                        placeholder="Ex.: PROZ-1A2B-3C4D"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={teamSubmitting}
                      className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition"
                    >
                      Entrar na Equipe
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
