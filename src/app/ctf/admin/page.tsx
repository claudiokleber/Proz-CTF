"use client";

import { useEffect, useState, useCallback } from "react";
import CtfNavbar, { PlatformUserClient } from "@/components/ctf/CtfNavbar";
import {
  Settings,
  Power,
  RotateCcw,
  Plus,
  Edit3,
  Trash2,
  Users,
  Flag,
  Clock,
  X,
} from "lucide-react";

interface AdminTeamRow {
  rank: number;
  teamId: string;
  teamName: string;
  inviteCode: string;
  members: Array<{ id: string; name: string; email: string }>;
  totalPoints: number;
  solvedCount: number;
  lastScoringSolveAt: string | null;
  solves: Array<{
    challengeId: string;
    challengeNumber: number;
    challengeTitle: string;
    points: number;
    solvedBy: string;
    solvedAt: string;
  }>;
}

interface AdminChallenge {
  id: string;
  number: number;
  title: string;
  category: string;
  type: string;
  difficulty: string;
  points: number;
  description: string;
  hint1: string | null;
  hint2: string | null;
  active: boolean;
}

interface RecentSubmission {
  id: string;
  correct: boolean;
  createdAt: string;
  team: { name: string };
  user: { name: string; email: string };
  challenge: { number: number; title: string; points: number };
}

export default function CtfAdminPage() {
  const [user, setUser] = useState<PlatformUserClient | null>(null);
  const [eventoAtivo, setEventoAtivo] = useState(true);
  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<
    RecentSubmission[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [activeTab, setActiveTab] = useState<
    "teams" | "challenges" | "submissions"
  >("teams");

  // Modal state for Challenge CRUD
  const [editingChallenge, setEditingChallenge] =
    useState<AdminChallenge | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formNumber, setFormNumber] = useState(18);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formType, setFormType] = useState("investigativo");
  const [formDifficulty, setFormDifficulty] = useState("facil");
  const [formPoints, setFormPoints] = useState(100);
  const [formDescription, setFormDescription] = useState("");
  const [formHint1, setFormHint1] = useState("");
  const [formHint2, setFormHint2] = useState("");
  const [formFlag, setFormFlag] = useState("");
  const [formActive, setFormActive] = useState(true);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [meRes, admRes] = await Promise.all([
        fetch("/api/ctf/me", { cache: "no-store" }),
        fetch("/api/ctf/admin", { cache: "no-store" }),
      ]);
      const meData = await meRes.json();
      setUser(meData.user ?? null);

      if (!admRes.ok) {
        const err = await admRes.json();
        setErrorMsg(err.error || "Acesso restrito ao administrador.");
        return;
      }

      const admData = await admRes.json();
      setEventoAtivo(admData.eventoAtivo ?? true);
      setTeams(admData.scoreboard ?? []);
      setChallenges(admData.challenges ?? []);
      setRecentSubmissions(admData.recentSubmissions ?? []);
    } catch {
      setErrorMsg("Erro ao carregar painel administrativo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function handleToggleEvent() {
    setStatusMsg("");
    const nextState = !eventoAtivo;
    const res = await fetch("/api/ctf/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleEvent", eventoAtivo: nextState }),
    });
    if (res.ok) {
      setEventoAtivo(nextState);
      setStatusMsg(
        nextState
          ? "Evento iniciado! Os alunos já podem submeter flags."
          : "Evento encerrado/pausado! Novas submissões estão bloqueadas."
      );
    }
  }

  async function handleResetScoreboard() {
    if (
      !confirm(
        "ATENÇÃO: Tem certeza que deseja zerar todo o placar e apagar todas as submissões?"
      )
    ) {
      return;
    }
    const res = await fetch("/api/ctf/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetScoreboard" }),
    });
    if (res.ok) {
      setStatusMsg("Placar resetado com sucesso!");
      await loadAdminData();
    }
  }

  async function handleResetTeamsAndUsers() {
    if (
      !confirm(
        "ATENÇÃO: Deseja excluir TODAS as equipes, submissões e contas de alunos (mantendo apenas o Instrutor Admin e os desafios)?"
      )
    ) {
      return;
    }
    const res = await fetch("/api/ctf/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetTeamsAndUsers" }),
    });
    if (res.ok) {
      setStatusMsg("Todas as equipes e contas de alunos foram removidas!");
      await loadAdminData();
    }
  }

  async function handleDeleteTeam(teamId: string, teamName: string) {
    if (!confirm(`Deseja realmente excluir a equipe "${teamName}"?`)) {
      return;
    }
    const res = await fetch("/api/ctf/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteTeam", teamId }),
    });
    if (res.ok) {
      setStatusMsg(`Equipe "${teamName}" excluída com sucesso!`);
      await loadAdminData();
    }
  }

  function openCreateModal() {
    setIsCreating(true);
    setEditingChallenge(null);
    setFormNumber(challenges.length + 1);
    setFormTitle("");
    setFormCategory("Exposição de dados");
    setFormType("investigativo");
    setFormDifficulty("facil");
    setFormPoints(100);
    setFormDescription("");
    setFormHint1("");
    setFormHint2("");
    setFormFlag("");
    setFormActive(true);
  }

  function openEditModal(ch: AdminChallenge) {
    setIsCreating(false);
    setEditingChallenge(ch);
    setFormNumber(ch.number);
    setFormTitle(ch.title);
    setFormCategory(ch.category);
    setFormType(ch.type);
    setFormDifficulty(ch.difficulty);
    setFormPoints(ch.points);
    setFormDescription(ch.description);
    setFormHint1(ch.hint1 || "");
    setFormHint2(ch.hint2 || "");
    setFormFlag("");
    setFormActive(ch.active);
  }

  async function handleSaveChallenge(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg("");

    const payload = isCreating
      ? {
          action: "createChallenge",
          number: formNumber,
          title: formTitle,
          category: formCategory,
          type: formType,
          difficulty: formDifficulty,
          points: formPoints,
          description: formDescription,
          hint1: formHint1,
          hint2: formHint2,
          flag: formFlag,
          active: formActive,
        }
      : {
          action: "updateChallenge",
          id: editingChallenge!.id,
          number: formNumber,
          title: formTitle,
          category: formCategory,
          type: formType,
          difficulty: formDifficulty,
          points: formPoints,
          description: formDescription,
          hint1: formHint1,
          hint2: formHint2,
          newFlag: formFlag,
          active: formActive,
        };

    const res = await fetch("/api/ctf/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Erro ao salvar desafio.");
      return;
    }

    setIsCreating(false);
    setEditingChallenge(null);
    setStatusMsg("Desafio salvo com sucesso!");
    await loadAdminData();
  }

  async function handleDeleteChallenge(id: string, title: string) {
    if (!confirm(`Deseja realmente excluir o desafio "${title}"?`)) return;
    const res = await fetch("/api/ctf/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteChallenge", id }),
    });
    if (res.ok) {
      setStatusMsg("Desafio excluído.");
      await loadAdminData();
    }
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("pt-BR");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <CtfNavbar
        user={user}
        eventoAtivo={eventoAtivo}
        onLogout={() => setUser(null)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            Carregando painel administrativo...
          </div>
        ) : errorMsg ? (
          <div className="max-w-lg mx-auto my-16 p-8 rounded-2xl bg-rose-950/60 border border-rose-700/60 text-center">
            <h2 className="text-xl font-bold text-rose-200 mb-2">
              Acesso Restrito
            </h2>
            <p className="text-sm text-rose-300">{errorMsg}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Barra de controle do evento */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                  <Settings className="w-7 h-7 text-indigo-400" />
                  Painel do Instrutor — Administração Proz CTF
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Controle o estado do evento, acompanhe as equipes em detalhes,
                  edite desafios ou resete o placar entre turmas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleEvent}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
                    eventoAtivo
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                      : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {eventoAtivo
                    ? "Pausar / Encerrar Evento"
                    : "Iniciar / Reabrir Evento"}
                </button>

                <button
                  type="button"
                  onClick={handleResetScoreboard}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resetar Placar
                </button>

                <button
                  type="button"
                  onClick={handleResetTeamsAndUsers}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 border border-rose-700/60 text-rose-300 font-bold text-xs transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Equipes & Alunos
                </button>
              </div>
            </div>

            {statusMsg && (
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-sm">
                {statusMsg}
              </div>
            )}

            {/* Abas do Admin */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab("teams")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "teams"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                Equipes & Flags Capturadas ({teams.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("challenges")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "challenges"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Flag className="w-4 h-4" />
                CRUD de Desafios ({challenges.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("submissions")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "submissions"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Clock className="w-4 h-4" />
                Últimas Tentativas ({recentSubmissions.length})
              </button>
            </div>

            {/* ABA 1: Equipes, membros, flags e horários */}
            {activeTab === "teams" && (
              <div className="space-y-4">
                {teams.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
                    Nenhuma equipe cadastrada ainda.
                  </div>
                ) : (
                  teams.map((team) => (
                    <div
                      key={team.teamId}
                      className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                              #{team.rank}
                            </span>
                            <h3 className="text-lg font-bold text-white">
                              {team.teamName}
                            </h3>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 text-emerald-300 border border-slate-800">
                              Convite: {team.inviteCode}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            <strong>Membros ({team.members.length}):</strong>{" "}
                            {team.members
                              .map((m) => `${m.name} (${m.email})`)
                              .join(" · ")}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div className="text-xl font-extrabold text-emerald-400">
                              {team.totalPoints} pts
                            </div>
                            <div className="text-xs text-slate-400">
                              {team.solvedCount} flag(s) capturada(s)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteTeam(team.teamId, team.teamName)
                            }
                            title="Excluir equipe"
                            className="p-2 rounded-lg bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-700/60 text-rose-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                          Desafios Resolvidos & Horários:
                        </h4>
                        {team.solves.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            Nenhum desafio resolvido ainda.
                          </p>
                        ) : (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {team.solves.map((s) => (
                              <div
                                key={s.challengeId}
                                className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-semibold text-white">
                                    #{String(s.challengeNumber).padStart(2, "0")}{" "}
                                    {s.challengeTitle}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {s.solvedBy} · {formatDateTime(s.solvedAt)}
                                  </div>
                                </div>
                                <span className="font-bold text-emerald-400">
                                  +{s.points}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABA 2: CRUD de Desafios */}
            {activeTab === "challenges" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Desafio
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4">#</th>
                        <th className="py-3.5 px-4">Título</th>
                        <th className="py-3.5 px-4">Categoria</th>
                        <th className="py-3.5 px-4">Nível</th>
                        <th className="py-3.5 px-4">Pontos</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {challenges.map((ch) => (
                        <tr key={ch.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-slate-300">
                            #{String(ch.number).padStart(2, "0")}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {ch.title}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {ch.category}
                          </td>
                          <td className="py-3 px-4 uppercase text-slate-300">
                            {ch.difficulty}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-400">
                            {ch.points}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ch.active
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {ch.active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(ch)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center"
                              title="Editar desafio"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteChallenge(ch.id, ch.title)
                              }
                              className="p-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 inline-flex items-center"
                              title="Excluir desafio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 3: Log de submissões */}
            {activeTab === "submissions" && (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Horário</th>
                      <th className="py-3.5 px-4">Equipe</th>
                      <th className="py-3.5 px-4">Aluno</th>
                      <th className="py-3.5 px-4">Desafio</th>
                      <th className="py-3.5 px-4">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recentSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {formatDateTime(sub.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {sub.team.name}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {sub.user.name}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          #{String(sub.challenge.number).padStart(2, "0")} —{" "}
                          {sub.challenge.title}
                        </td>
                        <td className="py-3 px-4">
                          {sub.correct ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              CORRETA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                              INCORRETA
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Criar / Editar Desafio */}
      {(isCreating || editingChallenge) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white">
                {isCreating
                  ? "Criar Novo Desafio"
                  : `Editar Desafio #${editingChallenge?.number}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingChallenge(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChallenge} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Número</label>
                  <input
                    type="number"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Pontos</label>
                  <input
                    type="number"
                    required
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Dificuldade
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Categoria</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="investigativo">Investigativo</option>
                    <option value="tecnico_leve">Técnico Leve</option>
                    <option value="tecnico">Técnico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Dica 1</label>
                <input
                  type="text"
                  value={formHint1}
                  onChange={(e) => setFormHint1(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Dica 2</label>
                <input
                  type="text"
                  value={formHint2}
                  onChange={(e) => setFormHint2(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {isCreating
                    ? "Flag (será salva apenas como hash SHA-256)"
                    : "Nova Flag (deixe em branco para manter a atual)"}
                </label>
                <input
                  type="text"
                  required={isCreating}
                  value={formFlag}
                  onChange={(e) => setFormFlag(e.target.value)}
                  placeholder="CTF{proz_...}"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="challenge-active"
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                <label htmlFor="challenge-active" className="text-slate-300">
                  Desafio ativo e visível para os alunos
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingChallenge(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Salvar Desafio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
