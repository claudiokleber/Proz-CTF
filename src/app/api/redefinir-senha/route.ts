import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    if (!token || !newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "Informe o token de recuperação e a nova senha." },
        { status: 400 }
      );
    }

    const resetRecord = await shopDb.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord || resetRecord.used) {
      return NextResponse.json(
        { error: "Token de recuperação inválido ou já utilizado." },
        { status: 400 }
      );
    }

    await shopDb.$transaction([
      shopDb.shopUser.update({
        where: { id: resetRecord.userId },
        data: { password: newPassword },
      }),
      shopDb.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Senha redefinida com sucesso! Você já pode fazer login.",
    });
  } catch (error) {
    console.error("Erro em redefinir-senha:", error);
    return NextResponse.json(
      { error: "Erro ao redefinir senha." },
      { status: 500 }
    );
  }
}
