"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CtfNavbar, { PlatformUserClient } from "@/components/ctf/CtfNavbar";
import {
  extractCtfFlag,
  pasteFlagSafe,
} from "@/lib/clipboard";
import {
  Flag,
  CheckCircle2,
  HelpCircle,
  Send,
  X,
  AlertTriangle,
  Sparkles,
  ClipboardPaste,
} from "lucide-react";

interface ChallengeItem {
  id: string;
  number: number;
  title: string;
  category: string;
  type: string;
  difficulty: "facil" | "medio" | "dificil";
  points: number;
  description: string;
  hint1: string | null;
  hint2: string | null;
  active: boolean;
}

export default function CtfChallengesPage() {
  const [user, setUser] = useState<PlatformUserClient | null>(null);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [eventoAtivo, setEventoAtivo] = useState(true);
  const [loading, setLoading] = useState(true);

  const [difficultyFilter, setDifficultyFilter] = useState<string>("todos");
  const [selectedChallenge, setSelectedChallenge] =
    useState<ChallengeItem | null>(null);
  const [showHint1, setShowHint1] = useState(false);
  const [showHint2, setShowHint2] = useState(false);
  const [flagInput, setFlagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Barra de submissão rápida no topo (permite colar qualquer flag sem precisar procurar o card)
  const [quickFlagInput, setQuickFlagInput] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickFeedback, setQuickFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, chRes] = await Promise.all([
        fetch("/api/ctf/me", { cache: "no-store" }),
        fetch("/api/ctf/challenges", { cache: "no-store" }),
      ]);
      const meText = await meRes.text();
      const chText = await chRes.text();
      const meData = meText ? JSON.parse(meText) : {};
      const chData = chText ? JSON.parse(chText) : {};

      setUser(meData.user ?? null);
      setChallenges(chData.challenges ?? []);
      setSolvedIds(chData.solvedChallengeIds ?? []);
      setEventoAtivo(chData.eventoAtivo ?? true);
    } catch (err) {
      console.error("Erro ao carregar desafios:", err);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    try {
      localStorage.removeItem("proz_last_copied_flag");
    } catch {
      // ignore
    }
  }, [loadData]);

  function openChallengeModal(ch: ChallengeItem) {
    setSelectedChallenge(ch);
    setShowHint1(false);
    setShowHint2(false);
    setFlagInput("");
    setFeedback(null);
  }

  async function handlePasteIntoModal() {
    const pasted = await pasteFlagSafe();
    if (pasted) {
      setFlagInput(extractCtfFlag(pasted));
    }
  }

  async function handlePasteIntoQuickBar() {
    const pasted = await pasteFlagSafe();
    if (pasted) {
      setQuickFlagInput(extractCtfFlag(pasted));
    }
  }

  async function handleQuickSubmitFlag(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = extractCtfFlag(quickFlagInput);
    if (!cleaned) return;

    setQuickSubmitting(true);
    setQuickFeedback(null);

    try {
      const res = await fetch("/api/ctf/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flag: cleaned,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setQuickFeedback({
          type: "error",
          text: data.error || "Não foi possível enviar a flag.",
        });
        return;
      }

      if (data.correct) {
        setQuickFeedback({
          type: data.alreadySolvedByTeam ? "info" : "success",
          text: data.message,
        });
        setQuickFlagInput("");
        if (data.challengeId && !solvedIds.includes(data.challengeId)) {
          setSolvedIds((prev) => [...prev, data.challengeId]);
        }
      } else {
        setQuickFeedback({
          type: "error",
          text: data.message || "Flag incorreta.",
        });
      }
    } catch {
      setQuickFeedback({
        type: "error",
        text: "Erro de conexão ao validar a flag.",
      });
    } finally {
      setQuickSubmitting(false);
    }
  }

  async function handleSubmitFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChallenge) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/ctf/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: selectedChallenge.id,
          flag: extractCtfFlag(flagInput),
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Não foi possível enviar a flag.",
        });
        return;
      }

      if (data.correct) {
        setFeedback({
          type: data.alreadySolvedByTeam ? "info" : "success",
          text: data.message,
        });
        setFlagInput("");
        if (!solvedIds.includes(selectedChallenge.id)) {
          setSolvedIds((prev) => [...prev, selectedChallenge.id]);
        }
      } else {
        setFeedback({
          type: "error",
          text: data.message || "Flag incorreta.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Erro de conexão ao validar a flag.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function difficultyBadge(diff: string) {
    switch (diff) {
      case "facil":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Fácil
          </span>
        );
      case "medio":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Médio
          </span>
        );
      case "dificil":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Difícil
          </span>
        );
      default:
        return null;
    }
  }

  const filteredChallenges = challenges.filter((c) =>
    difficultyFilter === "todos" ? true : c.difficulty === difficultyFilter
  );

  const teamPoints = challenges
    .filter((c) => solvedIds.includes(c.id))
    .reduce((acc, c) => acc + c.points, 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <CtfNavbar
        user={user}
        eventoAtivo={eventoAtivo}
        onLogout={() => setUser(null)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho e Progresso da Equipe */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <Flag className="w-7 h-7 text-emerald-400" />
              Desafios Proz CTF
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Copie a flag encontrada na Loja Alvo e cole diretamente na barra
              rápida abaixo ou dentro do desafio correspondente.
            </p>
          </div>

          {user?.team ? (
            <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl">
              <div>
                <div className="text-xs text-slate-400">
                  Progresso de{" "}
                  <strong className="text-white">{user.team.name}</strong>
                </div>
                <div className="text-lg font-extrabold text-emerald-400">
                  {solvedIds.length} / {challenges.length} flags · {teamPoints}{" "}
                  pts
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-950/60 border border-amber-700/50 px-4 py-3 rounded-xl text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {user
                  ? "Entre ou crie uma equipe antes de enviar flags."
                  : "Faça login e entre em uma equipe para enviar flags."}
              </span>
              <Link
                href="/ctf"
                className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold whitespace-nowrap"
              >
                Configurar Equipe
              </Link>
            </div>
          )}
        </div>

        {/* Barra de Colar & Enviar Flag Rápida */}
        <div className="mb-8 rounded-2xl bg-slate-900/95 border border-emerald-500/30 p-5 shadow-lg">
          <div className="mb-2.5">
            <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Envio Rápido de Flag (Cole a flag aqui — identificamos o desafio
              automaticamente)
            </label>
          </div>

          <form
            onSubmit={handleQuickSubmitFlag}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                required
                disabled={!eventoAtivo || quickSubmitting || !user?.teamId}
                value={quickFlagInput}
                onChange={(e) =>
                  setQuickFlagInput(
                    e.target.value.includes("CTF{")
                      ? extractCtfFlag(e.target.value)
                      : e.target.value
                  )
                }
                placeholder="Cole aqui a flag (ex.: CTF{proz_...} ou a linha inteira onde a encontrou)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={!eventoAtivo || quickSubmitting || !user?.teamId}
                onClick={handlePasteIntoQuickBar}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold border border-slate-700 transition shrink-0"
                title="Colar flag copiada"
              >
                <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                Colar
              </button>
            </div>

            <button
              type="submit"
              disabled={!eventoAtivo || quickSubmitting || !user?.teamId}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition shrink-0"
            >
              <Send className="w-4 h-4" />
              {quickSubmitting ? "Validando..." : "Validar Flag"}
            </button>
          </form>

          {quickFeedback && (
            <div
              className={`mt-3 p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                quickFeedback.type === "success"
                  ? "bg-emerald-950/80 border-emerald-600/60 text-emerald-200"
                  : quickFeedback.type === "info"
                  ? "bg-cyan-950/80 border-cyan-600/60 text-cyan-200"
                  : "bg-rose-950/80 border-rose-600/60 text-rose-200"
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{quickFeedback.text}</span>
            </div>
          )}
        </div>

        {/* Filtros por nível */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[
            { id: "todos", label: "Todos (17)" },
            { id: "facil", label: "Fácil (1–6)" },
            { id: "medio", label: "Médio (7–14)" },
            { id: "dificil", label: "Difícil (15–17)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDifficultyFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                difficultyFilter === tab.id
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">
            Carregando desafios...
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredChallenges.map((ch) => {
              const solved = solvedIds.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => openChallengeModal(ch)}
                  className={`text-left rounded-2xl p-6 transition border flex flex-col justify-between group ${
                    solved
                      ? "bg-emerald-950/25 border-emerald-500/40 hover:border-emerald-400"
                      : "bg-slate-900/90 border-slate-800 hover:border-slate-600 hover:bg-slate-900"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
                        #{String(ch.number).padStart(2, "0")}
                      </span>
                      <div className="flex items-center gap-2">
                        {difficultyBadge(ch.difficulty)}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          {ch.points} pts
                        </span>
                      </div>
                    </div>

                    <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition mb-1">
                      {ch.title}
                    </h2>
                    <div className="text-xs text-slate-400 mb-3">
                      {ch.category}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {ch.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    {solved ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Capturada pela equipe
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 group-hover:text-slate-200">
                        Clique para abrir e enviar flag →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Detalhes e Submissão de Flag */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    Desafio #{String(selectedChallenge.number).padStart(2, "0")}
                  </span>
                  {difficultyBadge(selectedChallenge.difficulty)}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {selectedChallenge.points} pontos
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedChallenge.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Categoria: {selectedChallenge.category} · Tipo:{" "}
                  {selectedChallenge.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChallenge(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-6 space-y-5">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed">
                {selectedChallenge.description}
              </div>

              {/* Dicas */}
              <div className="space-y-2.5">
                {selectedChallenge.hint1 && (
                  <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                    {!showHint1 ? (
                      <button
                        type="button"
                        onClick={() => setShowHint1(true)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-amber-300 hover:text-amber-200"
                      >
                        <span className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" />
                          Revelar Dica Nível 1
                        </span>
                        <span>Mostrar</span>
                      </button>
                    ) : (
                      <div className="text-xs text-amber-200">
                        <strong className="block text-amber-400 mb-1">
                          💡 Dica 1:
                        </strong>
                        {selectedChallenge.hint1}
                      </div>
                    )}
                  </div>
                )}

                {selectedChallenge.hint2 && (
                  <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                    {!showHint2 ? (
                      <button
                        type="button"
                        onClick={() => setShowHint2(true)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-amber-300 hover:text-amber-200"
                      >
                        <span className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" />
                          Revelar Dica Nível 2
                        </span>
                        <span>Mostrar</span>
                      </button>
                    ) : (
                      <div className="text-xs text-amber-200">
                        <strong className="block text-amber-400 mb-1">
                          💡 Dica 2:
                        </strong>
                        {selectedChallenge.hint2}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {feedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                    feedback.type === "success"
                      ? "bg-emerald-950/80 border-emerald-600/60 text-emerald-200"
                      : feedback.type === "info"
                      ? "bg-cyan-950/80 border-cyan-600/60 text-cyan-200"
                      : "bg-rose-950/80 border-rose-600/60 text-rose-200"
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Formulário de envio da Flag */}
              <form onSubmit={handleSubmitFlag} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Submeter Flag Capturada
                  </label>
                  <button
                    type="button"
                    disabled={!eventoAtivo || submitting || !user?.teamId}
                    onClick={handlePasteIntoModal}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Colar Flag Copiada
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={!eventoAtivo || submitting || !user?.teamId}
                    value={flagInput}
                    onChange={(e) =>
                      setFlagInput(
                        e.target.value.includes("CTF{")
                          ? extractCtfFlag(e.target.value)
                          : e.target.value
                      )
                    }
                    placeholder="CTF{proz_...}"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!eventoAtivo || submitting || !user?.teamId}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Validando..." : "Enviar"}
                  </button>
                </div>
                {!user?.teamId && (
                  <p className="text-[11px] text-amber-400">
                    Você precisa estar em uma equipe para submeter flags.
                  </p>
                )}
                {!eventoAtivo && (
                  <p className="text-[11px] text-rose-400">
                    O evento está pausado/encerrado pelo instrutor.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
