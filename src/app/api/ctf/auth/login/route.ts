import { NextRequest, NextResponse } from "next/server";
import { platformDb } from "@/lib/db-platform";
import {
  setPlatformSessionCookie,
  verifyPlatformPassword,
} from "@/lib/ctf-auth";

import { logActivity } from '@/lib/log';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Informe e-mail e senha." },
        { status: 400 }
      );
    }

    const user = await platformDb.user.findUnique({
      where: { email },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const valid = await verifyPlatformPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    setPlatformSessionCookie(user.id);
  logActivity({
    ip: req.ip ?? '',
    method: req.method,
    path: req.nextUrl.pathname,
    status: 200,
    user: user.email,
    extra: 'login successful',
  });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        team: user.team,
      },
    });
  } catch (error) {
    console.error("Erro no login da plataforma:", error);
    return NextResponse.json(
      { error: "Erro interno ao autenticar." },
      { status: 500 }
    );
  }
}
