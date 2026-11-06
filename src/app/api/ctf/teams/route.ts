import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentPlatformUser,
  invalidateScoreboardCache,
} from "@/lib/ctf-auth";
import { platformDb } from "@/lib/db-platform";

function generateInviteCode(): string {
  const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PROZ-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentPlatformUser();
    if (!user) {
      return NextResponse.json(
        { error: "Você precisa estar autenticado na Plataforma CTF." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const action = body.action as "create" | "join" | "leave";

    if (action === "create") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length < 2 || name.length > 40) {
        return NextResponse.json(
          { error: "O nome da equipe deve ter entre 2 e 40 caracteres." },
          { status: 400 }
        );
      }

      const existingName = await platformDb.team.findUnique({
        where: { name },
      });
      if (existingName) {
        return NextResponse.json(
          { error: "Já existe uma equipe com este nome." },
          { status: 409 }
        );
      }

      let inviteCode = generateInviteCode();
      while (await platformDb.team.findUnique({ where: { inviteCode } })) {
        inviteCode = generateInviteCode();
      }

      const team = await platformDb.$transaction(async (tx) => {
        const createdTeam = await tx.team.create({
          data: {
            name,
            inviteCode,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { teamId: createdTeam.id },
        });

        return createdTeam;
      });

      invalidateScoreboardCache();
      return NextResponse.json({ team }, { status: 201 });
    }

    if (action === "join") {
      const inviteCode =
        typeof body.inviteCode === "string"
          ? body.inviteCode.trim().toUpperCase()
          : "";

      if (!inviteCode) {
        return NextResponse.json(
          { error: "Informe o código de convite da equipe." },
          { status: 400 }
        );
      }

      const team = await platformDb.team.findUnique({
        where: { inviteCode },
      });

      if (!team) {
        return NextResponse.json(
          { error: "Nenhuma equipe encontrada com este código de convite." },
          { status: 404 }
        );
      }

      await platformDb.user.update({
        where: { id: user.id },
        data: { teamId: team.id },
      });

      invalidateScoreboardCache();
      return NextResponse.json({ team });
    }

    if (action === "leave") {
      await platformDb.user.update({
        where: { id: user.id },
        data: { teamId: null },
      });
      invalidateScoreboardCache();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("Erro no gerenciamento de equipes:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerenciar equipe." },
      { status: 500 }
    );
  }
}
