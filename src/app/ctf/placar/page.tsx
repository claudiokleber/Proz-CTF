"use client";

import { useEffect, useState, useCallback } from "react";
import CtfNavbar, { PlatformUserClient } from "@/components/ctf/CtfNavbar";
import {
  Trophy,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";

interface TeamSolve {
  challengeId: string;
  challengeNumber: number;
  challengeTitle: string;
  points: number;
  solvedBy: string;
  solvedAt: string;
}

interface ScoreboardRow {
  rank: number;
  teamId: string;
  teamName: string;
  createdAt: string;
  members: Array<{ id: string; name: string; email: string }>;
  totalPoints: number;
  solvedCount: number;
  lastScoringSolveAt: string | null;
  solves: TeamSolve[];
}

export default function CtfScoreboardPage() {
  const [user, setUser] = useState<PlatformUserClient | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardRow[]>([]);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState(2225);
  const [totalActiveChallenges, setTotalActiveChallenges] = useState(17);
  const [eventoAtivo, setEventoAtivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const loadScoreboard = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, sbRes] = await Promise.all([
        fetch("/api/ctf/me", { cache: "no-store" }),
        fetch("/api/ctf/scoreboard", { cache: "no-store" }),
      ]);
      const meText = await meRes.text();
      const sbText = await sbRes.text();
      const meData = meText ? JSON.parse(meText) : {};
      const sbData = sbText ? JSON.parse(sbText) : {};

      setUser(meData.user ?? null);
      setScoreboard(sbData.scoreboard ?? []);
      setTotalPossiblePoints(sbData.totalPossiblePoints ?? 2225);
      setTotalActiveChallenges(sbData.totalActiveChallenges ?? 17);
      setEventoAtivo(sbData.eventoAtivo ?? true);
    } catch (err) {
      console.error("Erro ao carregar placar:", err);
      setScoreboard([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScoreboard();
    const timer = setInterval(loadScoreboard, 15000);
    return () => clearInterval(timer);
  }, [loadScoreboard]);

  function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <CtfNavbar
        user={user}
        eventoAtivo={eventoAtivo}
        onLogout={() => setUser(null)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <Trophy className="w-7 h-7 text-amber-400" />
              Placar Oficial — Proz CTF
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Ordenado por pontuação total. Critério de desempate: menor horário
              do último acerto que gerou pontos.
            </p>
          </div>
          <button
            type="button"
            onClick={loadScoreboard}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar Placar
          </button>
        </div>

        {scoreboard.length === 0 && !loading ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400">
            Nenhuma equipe cadastrada ainda. Crie sua equipe para inaugurar o
            placar!
          </div>
        ) : (
          <div className="space-y-3">
            {scoreboard.map((row) => {
              const isUserTeam = user?.teamId === row.teamId;
              const isExpanded = expandedTeamId === row.teamId;

              return (
                <div
                  key={row.teamId}
                  className={`rounded-2xl border transition overflow-hidden ${
                    isUserTeam
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : "bg-slate-900/90 border-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTeamId(isExpanded ? null : row.teamId)
                    }
                    className="w-full p-5 flex flex-wrap items-center justify-between gap-4 text-left hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                          row.rank === 1
                            ? "bg-amber-400 text-slate-950"
                            : row.rank === 2
                            ? "bg-slate-300 text-slate-950"
                            : row.rank === 3
                            ? "bg-amber-700 text-white"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        #{row.rank}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">
                            {row.teamName}
                          </span>
                          {isUserTeam && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                              Sua Equipe
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {row.members.length} integrante(s):{" "}
                          {row.members.map((m) => m.name).join(", ")}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Flags</div>
                        <div className="text-sm font-bold text-slate-200">
                          {row.solvedCount} / {totalActiveChallenges}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> Último acerto
                        </div>
                        <div className="text-xs font-mono text-slate-300">
                          {formatTime(row.lastScoringSolveAt)}
                        </div>
                      </div>

                      <div className="text-right min-w-[90px]">
                        <div className="text-xs text-slate-400">Pontuação</div>
                        <div className="text-xl font-extrabold text-emerald-400">
                          {row.totalPoints}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / {totalPossiblePoints}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/60">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        Histórico de Flags Capturadas pela Equipe
                      </h4>
                      {row.solves.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          Nenhuma flag capturada até o momento.
                        </p>
                      ) : (
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {row.solves.map((s) => (
                            <div
                              key={s.challengeId}
                              className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-semibold text-white">
                                  #{String(s.challengeNumber).padStart(2, "0")}{" "}
                                  — {s.challengeTitle}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  por {s.solvedBy} às {formatTime(s.solvedAt)}
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
