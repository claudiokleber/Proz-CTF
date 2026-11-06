import { NextRequest, NextResponse } from "next/server";
import { platformDb } from "@/lib/db-platform";
import {
  hashPlatformPassword,
  setPlatformSessionCookie,
} from "@/lib/ctf-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Informe seu nome completo (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const existing = await platformDb.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um cadastro com este e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPlatformPassword(password);

    // Segurança: o papel (role) NUNCA é lido do cliente; todo cadastro público é "player".
    const user = await platformDb.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: "player",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
      },
    });

    setPlatformSessionCookie(user.id);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Erro no registro da plataforma:", error);
    return NextResponse.json(
      { error: "Erro interno ao realizar o cadastro." },
      { status: 500 }
    );
  }
}
