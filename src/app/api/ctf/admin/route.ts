import { NextRequest, NextResponse } from "next/server";
import {
  computeScoreboard,
  getCurrentPlatformUser,
  hashFlagValue,
  invalidateScoreboardCache,
} from "@/lib/ctf-auth";
import { platformDb } from "@/lib/db-platform";

export const dynamic = "force-dynamic";

async function requirePlatformAdmin() {
  const user = await getCurrentPlatformUser();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

export async function GET() {
  try {
    const admin = await requirePlatformAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado. Exclusivo para administradores da plataforma." },
        { status: 403 }
      );
    }

    const [board, config, challenges, recentSubmissions] = await Promise.all([
      computeScoreboard(),
      platformDb.platformConfig.findUnique({ where: { id: "singleton" } }),
      platformDb.challenge.findMany({
        orderBy: { number: "asc" },
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
      platformDb.submission.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          team: { select: { name: true } },
          user: { select: { name: true, email: true } },
          challenge: { select: { number: true, title: true, points: true } },
        },
      }),
    ]);

    return NextResponse.json({
      eventoAtivo: config ? config.eventoAtivo : true,
      ...board,
      challenges,
      recentSubmissions,
    });
  } catch (error) {
    console.error("Erro em GET /api/ctf/admin:", error);
    return NextResponse.json(
      { error: "Erro ao carregar painel administrativo." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Acesso negado. Exclusivo para administradores da plataforma." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "toggleEvent") {
      const eventoAtivo = Boolean(body.eventoAtivo);
      const updated = await platformDb.platformConfig.upsert({
        where: { id: "singleton" },
        update: { eventoAtivo },
        create: { id: "singleton", eventoAtivo },
      });
      return NextResponse.json({ eventoAtivo: updated.eventoAtivo });
    }

    if (action === "resetScoreboard") {
      await platformDb.submission.deleteMany();
      invalidateScoreboardCache();
      return NextResponse.json({
        ok: true,
        message: "Placar e submissões resetados com sucesso.",
      });
    }

    if (action === "resetTeamsAndUsers") {
      await platformDb.submission.deleteMany();
      await platformDb.user.deleteMany({
        where: { role: { not: "admin" } },
      });
      await platformDb.team.deleteMany();
      invalidateScoreboardCache();
      return NextResponse.json({
        ok: true,
        message: "Todas as equipes, submissões e contas de alunos foram removidas.",
      });
    }

    if (action === "deleteTeam") {
      const teamId = String(body.teamId || "").trim();
      if (!teamId) {
        return NextResponse.json(
          { error: "ID da equipe é obrigatório." },
          { status: 400 }
        );
      }
      await platformDb.submission.deleteMany({ where: { teamId } });
      await platformDb.user.updateMany({
        where: { teamId },
        data: { teamId: null },
      });
      await platformDb.team.delete({ where: { id: teamId } });
      invalidateScoreboardCache();
      return NextResponse.json({
        ok: true,
        message: "Equipe excluída com sucesso.",
      });
    }

    if (action === "createChallenge") {
      const number = Number(body.number);
      const title = String(body.title || "").trim();
      const category = String(body.category || "").trim();
      const type = String(body.type || "investigativo").trim();
      const difficulty = String(body.difficulty || "facil").trim();
      const points = Number(body.points);
      const description = String(body.description || "").trim();
      const hint1 = body.hint1 ? String(body.hint1).trim() : null;
      const hint2 = body.hint2 ? String(body.hint2).trim() : null;
      const flag = String(body.flag || "").trim();
      const active = body.active !== undefined ? Boolean(body.active) : true;

      if (!number || !title || !category || !points || !description || !flag) {
        return NextResponse.json(
          {
            error:
              "Preencha todos os campos obrigatórios (número, título, categoria, pontos, descrição e flag).",
          },
          { status: 400 }
        );
      }

      const created = await platformDb.challenge.create({
        data: {
          number,
          title,
          category,
          type,
          difficulty,
          points,
          description,
          hint1,
          hint2,
          flagHash: hashFlagValue(flag),
          active,
        },
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
      });

      return NextResponse.json({ challenge: created }, { status: 201 });
    }

    if (action === "updateChallenge") {
      const id = String(body.id || "").trim();
      if (!id) {
        return NextResponse.json(
          { error: "ID do desafio é obrigatório." },
          { status: 400 }
        );
      }

      const dataToUpdate: Record<string, unknown> = {
        number: Number(body.number),
        title: String(body.title || "").trim(),
        category: String(body.category || "").trim(),
        type: String(body.type || "investigativo").trim(),
        difficulty: String(body.difficulty || "facil").trim(),
        points: Number(body.points),
        description: String(body.description || "").trim(),
        hint1: body.hint1 ? String(body.hint1).trim() : null,
        hint2: body.hint2 ? String(body.hint2).trim() : null,
        active: Boolean(body.active),
      };

      if (typeof body.newFlag === "string" && body.newFlag.trim().length > 0) {
        dataToUpdate.flagHash = hashFlagValue(body.newFlag.trim());
      }

      const updated = await platformDb.challenge.update({
        where: { id },
        data: dataToUpdate,
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
      });

      return NextResponse.json({ challenge: updated });
    }

    if (action === "deleteChallenge") {
      const id = String(body.id || "").trim();
      if (!id) {
        return NextResponse.json(
          { error: "ID do desafio é obrigatório." },
          { status: 400 }
        );
      }

      await platformDb.challenge.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação administrativa inválida." }, { status: 400 });
  } catch (error) {
    console.error("Erro na ação administrativa:", error);
    return NextResponse.json(
      { error: "Erro ao processar ação administrativa." },
      { status: 500 }
    );
  }
}
