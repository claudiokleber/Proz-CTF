import { NextResponse } from "next/server";
import { getCurrentPlatformUser } from "@/lib/ctf-auth";
import { platformDb } from "@/lib/db-platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [user, challenges, config] = await Promise.all([
      getCurrentPlatformUser(),
      platformDb.challenge.findMany({
        where: { active: true },
        orderBy: { number: "asc" },
        // Segurança: NUNCA incluir flagHash no select enviado ao cliente
        select: {
          id: true,
          number: true,
          title: true,
          category: true,
          type: true,
          difficulty: true,
          points: true,
          description: true,
          hint1: true,
          hint2: true,
          active: true,
        },
      }),
      platformDb.platformConfig.findUnique({ where: { id: "singleton" } }),
    ]);

    let solvedChallengeIds: string[] = [];
    if (user?.teamId) {
      const teamSolves = await platformDb.submission.findMany({
        where: {
          teamId: user.teamId,
          correct: true,
        },
        select: { challengeId: true },
        distinct: ["challengeId"],
      });
      solvedChallengeIds = teamSolves.map((s) => s.challengeId);
    }

    return NextResponse.json({
      challenges,
      solvedChallengeIds,
      eventoAtivo: config ? config.eventoAtivo : true,
    });
  } catch (error) {
    console.error("Erro em GET /api/ctf/challenges:", error);
    return NextResponse.json(
      {
        error: "Erro ao consultar desafios no banco de dados.",
        challenges: [],
        solvedChallengeIds: [],
        eventoAtivo: true,
      },
      { status: 500 }
    );
  }
}
