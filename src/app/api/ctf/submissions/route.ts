import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentPlatformUser,
  invalidateScoreboardCache,
  verifyFlagWithTimingSafe,
} from "@/lib/ctf-auth";
import { platformDb } from "@/lib/db-platform";
import { logActivity } from '@/lib/log';


// Rate limit em memória complementar ao timestamp do banco (1 tentativa a cada 3s por usuário)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 3000;

/**
 * Se o aluno colar uma linha inteira (ex.: comentário HTML, linha de CSV ou JSON),
 * extrai automaticamente o trecho CTF{...}.
 */
function normalizeSubmittedFlag(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/CTF\{[^}\s"']+\}/i);
  return match ? match[0].trim() : trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentPlatformUser();
    if (!user) {
      return NextResponse.json(
        { error: "Você precisa estar logado para enviar uma flag." },
        { status: 401 }
      );
    }

    if (!user.teamId) {
      return NextResponse.json(
        {
          error:
            "Você precisa criar ou entrar em uma equipe antes de enviar flags.",
        },
        { status: 403 }
      );
    }

    // 1. Verifica se o evento está ativo
    const config = await platformDb.platformConfig.findUnique({
      where: { id: "singleton" },
    });
    if (config && !config.eventoAtivo) {
      return NextResponse.json(
        {
          error:
            "O evento está pausado ou encerrado pelo instrutor. Novos envios estão bloqueados.",
        },
        { status: 403 }
      );
    }

    // 2. Rate limit (3 segundos por usuário — checa memória + banco de dados)
    const now = Date.now();
    const lastMemoryAttempt = rateLimitMap.get(user.id) ?? 0;
    if (now - lastMemoryAttempt < RATE_LIMIT_WINDOW_MS) {
      const waitSec = Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (now - lastMemoryAttempt)) / 1000
      );
      return NextResponse.json(
        {
          error: `Aguarde ${waitSec}s antes de tentar novamente (limite de 1 tentativa a cada 3 segundos).`,
        },
        { status: 429 }
      );
    }

    const lastDbSubmission = await platformDb.submission.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (
      lastDbSubmission &&
      now - lastDbSubmission.createdAt.getTime() < RATE_LIMIT_WINDOW_MS
    ) {
      const waitSec = Math.ceil(
        (RATE_LIMIT_WINDOW_MS -
          (now - lastDbSubmission.createdAt.getTime())) /
          1000
      );
      return NextResponse.json(
        {
          error: `Aguarde ${waitSec}s antes de tentar novamente (limite de 1 tentativa a cada 3 segundos).`,
        },
        { status: 429 }
      );
    }

    rateLimitMap.set(user.id, now);

    // 3. Valida payload (suporta envio para desafio específico OU envio rápido global identificando pelo hash)
    const body = await req.json();
    const challengeId =
      typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const rawFlag = typeof body.flag === "string" ? body.flag : "";
    const submittedFlag = normalizeSubmittedFlag(rawFlag);

    if (!submittedFlag) {
      return NextResponse.json(
        { error: "Cole ou digite uma flag no formato CTF{...} para validar." },
        { status: 400 }
      );
    }

    let challenge = challengeId
      ? await platformDb.challenge.findUnique({ where: { id: challengeId } })
      : null;

    let isCorrect = false;

    if (challenge) {
      if (!challenge.active) {
        return NextResponse.json(
          { error: "Desafio não encontrado ou inativo." },
          { status: 404 }
        );
      }
      isCorrect = verifyFlagWithTimingSafe(submittedFlag, challenge.flagHash);
    } else {
      // Modo Submissão Rápida: identifica automaticamente a qual desafio ativo a flag pertence
      const activeChallenges = await platformDb.challenge.findMany({
        where: { active: true },
        orderBy: { number: "asc" },
      });

      const matched = activeChallenges.find((ch) =>
        verifyFlagWithTimingSafe(submittedFlag, ch.flagHash)
      );

      if (matched) {
        challenge = matched;
        isCorrect = true;
      } else {
        return NextResponse.json({
          correct: false,
          alreadySolvedByTeam: false,
          pointsAwarded: 0,
          message:
            "Flag incorreta! Nenhum desafio ativo corresponde a esta flag.",
        });
      }
    }

    // 5. Verifica se a equipe já havia acertado este desafio antes
    const previousTeamSolve = await platformDb.submission.findFirst({
      where: {
        teamId: user.teamId,
        challengeId: challenge.id,
        correct: true,
      },
    });

    // Registra a submissão (mesmo acertos repetidos são registrados no histórico, mas não somam pontos novamente)
    await platformDb.submission.create({
      data: {
        teamId: user.teamId,
        userId: user.id,
        challengeId: challenge.id,
        correct: isCorrect,
      },
    });

    if (isCorrect) {
      invalidateScoreboardCache();
    }

    if (!isCorrect) {
      logActivity({
        ip: req.ip ?? '',
        method: req.method,
        path: req.nextUrl.pathname,
        status: 200,
        user: user.email,
        extra: 'submission incorrect',
      });
      return NextResponse.json({
        correct: false,
        challengeId: challenge.id,
        alreadySolvedByTeam: Boolean(previousTeamSolve),
        pointsAwarded: 0,
        message: "Flag incorreta! Revise suas anotações e tente novamente.",
      });
    }

    if (previousTeamSolve) {
      logActivity({
        ip: req.ip ?? '',
        method: req.method,
        path: req.nextUrl.pathname,
        status: 200,
        user: user.email,
        extra: 'submission already solved',
      });
      return NextResponse.json({
        correct: true,
        challengeId: challenge.id,
        challengeNumber: challenge.number,
        challengeTitle: challenge.title,
        alreadySolvedByTeam: true,
        pointsAwarded: 0,
        message: `Flag do Desafio #${String(challenge.number).padStart(
          2,
          "0"
        )} (${challenge.title}) correta! Sua equipe já havia capturado esta flag anteriormente.`,
      });
    }

    return NextResponse.json({
      correct: true,
      challengeId: challenge.id,
      challengeNumber: challenge.number,
      challengeTitle: challenge.title,
      alreadySolvedByTeam: false,
      pointsAwarded: challenge.points,
      message: `🎉 Desafio #${String(challenge.number).padStart(2, "0")} (${
        challenge.title
      }) resolvido! +${challenge.points} pontos para a equipe ${
        user.team?.name
      }!`,
    });
  } catch (error) {
    console.error("Erro ao processar submissão de flag:", error);
    return NextResponse.json(
      { error: "Erro interno ao validar a flag." },
      { status: 500 }
    );
  }
}
