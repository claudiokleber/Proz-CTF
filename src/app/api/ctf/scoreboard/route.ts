import { NextResponse } from "next/server";
import { computeScoreboard } from "@/lib/ctf-auth";
import { platformDb } from "@/lib/db-platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [board, config] = await Promise.all([
      computeScoreboard(),
      platformDb.platformConfig.findUnique({ where: { id: "singleton" } }),
    ]);

    return NextResponse.json({
      ...board,
      eventoAtivo: config ? config.eventoAtivo : true,
    });
  } catch (error) {
    console.error("Erro em GET /api/ctf/scoreboard:", error);
    return NextResponse.json(
      {
        error: "Erro ao consultar o placar.",
        totalPossiblePoints: 2225,
        totalActiveChallenges: 17,
        scoreboard: [],
        eventoAtivo: true,
      },
      { status: 500 }
    );
  }
}
