import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail para recuperação." },
        { status: 400 }
      );
    }

    const user = await shopDb.shopUser.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Nenhuma conta encontrada com este endereço de e-mail." },
        { status: 404 }
      );
    }

    // ⚠️ VULN #17 — A chave mestra (Token de recuperação previsível e vazado na resposta da API)
    // 1. O token de redefinição de senha (`PasswordReset.token`) é gerado de forma
    //    totalmente previsível (sequencial incremental a partir de 1001).
    // 2. Pior ainda: a própria resposta HTTP da API devolve o `resetToken` gerado no
    //    JSON (normalmente deixado por desenvolvedores para facilitar testes sem servidor
    //    de e-mail), permitindo que qualquer pessoa com a aba Network (F12) aberta capture
    //    o token de `admin@proz.com` e redefina a senha do administrador em `/redefinir-senha`.
    // Correção real:
    // - Gerar tokens criptograficamente aleatórios (`crypto.randomBytes(32).toString('hex')`);
    // - Armazenar apenas o hash do token no banco com expiração curta (ex.: 15 min);
    // - Jamais incluir o token ou link de recuperação na resposta HTTP da API — enviar
    //   exclusivamente para o canal de e-mail verificado do titular da conta.
    const count = await shopDb.passwordReset.count();
    const predictableSequentialToken = `PROZ-RESET-${1001 + count}`;

    await shopDb.passwordReset.create({
      data: {
        userId: user.id,
        token: predictableSequentialToken,
      },
    });

    return NextResponse.json({
      ok: true,
      message:
        "Solicitação registrada! Verifique seu e-mail para prosseguir com a redefinição.",
      // ⚠️ VULN #17 — Vazamento direto do token de reset no payload de resposta da API
      debugResetInfo: {
        targetEmail: user.email,
        resetToken: predictableSequentialToken,
        resetUrl: `/redefinir-senha?token=${predictableSequentialToken}`,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Erro em recuperar-senha:", error);
    return NextResponse.json(
      { error: "Erro ao solicitar recuperação de senha." },
      { status: 500 }
    );
  }
}
