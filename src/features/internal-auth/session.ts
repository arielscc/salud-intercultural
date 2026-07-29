import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { describeSessionDevice } from "@/features/internal-auth/session-label";
import { prisma } from "@/modules/database";

export const internalSessionCookieName = "sigeco_session";

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createInternalSession(userId: string, userAgent?: string | null) {
  const token = createSessionToken();
  const sessionSeconds = Number(process.env.INTERNAL_SESSION_SECONDS ?? 60 * 60 * 8);
  const expiresAt = new Date(Date.now() + sessionSeconds * 1000);

  await prisma.internalSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      deviceLabel: describeSessionDevice(userAgent),
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function setInternalSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(internalSessionCookieName, token, {
    expires: expiresAt,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/sigeco"
  });
}

export async function clearInternalSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(internalSessionCookieName);
}

export async function getInternalSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(internalSessionCookieName)?.value;
}

export async function deleteInternalSession(token: string) {
  await prisma.internalSession.deleteMany({
    where: {
      tokenHash: hashSessionToken(token)
    }
  });
}

export async function getInternalSessionByToken(token: string) {
  const session = await prisma.internalSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token)
    },
    include: {
      user: true
    }
  });

  if (!session || session.expiresAt <= new Date() || !session.user.active) {
    if (session) {
      await prisma.internalSession.delete({ where: { id: session.id } }).catch(() => null);
    }

    return null;
  }

  return session;
}

export async function getInternalUserBySessionToken(token: string) {
  const session = await getInternalSessionByToken(token);
  return session?.user ?? null;
}
