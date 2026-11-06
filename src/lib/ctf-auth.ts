import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { platformDb } from "./db-platform";

const SESSION_COOKIE_NAME = "proz_ctf_platform_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

function getPlatformSecret(): string {
  return (
    process.env.PLATFORM_SESSION_SECRET ||
    "proz-ctf-dev-platform-secret-key-change-in-prod-9f8e7d6c5b4a"
  );
}

export async function hashPlatformPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPlatformPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hashFlagValue(flag: string): string {
  return crypto.createHash("sha256").update(flag.trim()).digest("hex");
}

export function verifyFlagWithTimingSafe(
  submittedFlag: string,
  expectedHashHex: string
): boolean {
  const submittedHashHex = hashFlagValue(submittedFlag);
  const a = Buffer.from(submittedHashHex, "hex");
  const b = Buffer.from(expectedHashHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

interface SessionPayload {
  userId: string;
  exp: number;
}

export function signPlatformSession(userId: string): string {
  const payload: SessionPayload = {
    userId,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getPlatformSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyPlatformSessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    const expectedSig = crypto
      .createHmac("sha256", getPlatformSecret())
      .update(payloadB64)
      .digest("base64url");

    const a = Buffer.from(sigB64);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    ) as SessionPayload;

    if (!payload.userId || typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function setPlatformSessionCookie(userId: string): void {
  const token = signPlatformSession(userId);
  // Importante para LAN / Sala de Aula: em HTTP local (ex.: http://192.168.x.x:3000),
  // `secure` precisa ser false para que o navegador aceite o cookie mesmo rodando `next start`.
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearPlatformSessionCookie(): void {
  cookies().delete(SESSION_COOKIE_NAME);
}

/**
 * Busca o usuário autenticado na Plataforma CTF diretamente no banco `platform`.
 * Nunca confia em claims de role ou teamId vindos do cliente.
 */
export async function getCurrentPlatformUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = verifyPlatformSessionToken(token);
    if (!session) return null;

    const user = await platformDb.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
            createdAt: true,
          },
        },
      },
    });

    return user;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("outside a request scope")) {
      console.error("Erro ao consultar usuário da plataforma:", err);
    }
    return null;
  }
}

const globalForScoreboardCache = globalThis as unknown as {
  scoreboardCache?: {
    expiresAt: number;
    data: Awaited<ReturnType<typeof computeScoreboardUncached>>;
  };
};

export function invalidateScoreboardCache() {
  globalForScoreboardCache.scoreboardCache = undefined;
}

export async function computeScoreboard() {
  const now = Date.now();
  if (
    globalForScoreboardCache.scoreboardCache &&
    globalForScoreboardCache.scoreboardCache.expiresAt > now
  ) {
    return globalForScoreboardCache.scoreboardCache.data;
  }

  const data = await computeScoreboardUncached();
  globalForScoreboardCache.scoreboardCache = {
    expiresAt: now + 2000, // Cache de 2s para absorver picos de 30+ alunos na LAN
    data,
  };
  return data;
}

/**
 * Calcula o placar oficial de todas as equipes:
 * - Apenas o PRIMEIRO acerto (correct: true) de uma equipe por desafio soma pontos.
 * - Desempate pelo horário do último acerto que gerou pontos (quem atingiu a pontuação primeiro fica na frente).
 */
async function computeScoreboardUncached() {
  const [teams, challenges] = await Promise.all([
    platformDb.team.findMany({
      include: {
        members: {
          select: { id: true, name: true, email: true },
        },
        submissions: {
          where: { correct: true },
          orderBy: { createdAt: "asc" },
          include: {
            challenge: {
              select: {
                id: true,
                number: true,
                title: true,
                points: true,
                category: true,
                difficulty: true,
              },
            },
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    platformDb.challenge.findMany({
      where: { active: true },
      select: { id: true, points: true },
    }),
  ]);

  const totalPossiblePoints = challenges.reduce((acc, c) => acc + c.points, 0);
  const totalActiveChallenges = challenges.length;

  const rows = teams.map((team) => {
    const seenChallenges = new Set<string>();
    let totalPoints = 0;
    let lastScoringSolveAt: Date | null = null;
    const solves: Array<{
      challengeId: string;
      challengeNumber: number;
      challengeTitle: string;
      points: number;
      solvedBy: string;
      solvedAt: string;
    }> = [];

    for (const sub of team.submissions) {
      if (!seenChallenges.has(sub.challengeId)) {
        seenChallenges.add(sub.challengeId);
        totalPoints += sub.challenge.points;
        lastScoringSolveAt = sub.createdAt;
        solves.push({
          challengeId: sub.challengeId,
          challengeNumber: sub.challenge.number,
          challengeTitle: sub.challenge.title,
          points: sub.challenge.points,
          solvedBy: sub.user.name,
          solvedAt: sub.createdAt.toISOString(),
        });
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      inviteCode: team.inviteCode,
      createdAt: team.createdAt.toISOString(),
      members: team.members,
      totalPoints,
      solvedCount: solves.length,
      lastScoringSolveAt: lastScoringSolveAt ? lastScoringSolveAt.toISOString() : null,
      solves,
    };
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (a.lastScoringSolveAt && b.lastScoringSolveAt) {
      return (
        new Date(a.lastScoringSolveAt).getTime() -
        new Date(b.lastScoringSolveAt).getTime()
      );
    }
    if (a.lastScoringSolveAt) return -1;
    if (b.lastScoringSolveAt) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return {
    totalPossiblePoints,
    totalActiveChallenges,
    scoreboard: rows.map((row, idx) => ({
      rank: idx + 1,
      ...row,
    })),
  };
}
