import { NextResponse } from "next/server";
import { getCurrentPlatformUser } from "@/lib/ctf-auth";
import { platformDb } from "@/lib/db-platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [user, config] = await Promise.all([
      getCurrentPlatformUser(),
      platformDb.platformConfig.findUnique({ where: { id: "singleton" } }),
    ]);

    let teamMembers: Array<{ id: string; name: string; email: string }> = [];
    if (user?.teamId) {
      teamMembers = await platformDb.user.findMany({
        where: { teamId: user.teamId },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({
      user,
      teamMembers,
      eventoAtivo: config ? config.eventoAtivo : true,
    });
  } catch (error) {
    console.error("Erro em GET /api/ctf/me:", error);
    return NextResponse.json({
      user: null,
      teamMembers: [],
      eventoAtivo: true,
    });
  }
}
