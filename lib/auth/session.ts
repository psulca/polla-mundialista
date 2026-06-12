import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "polla_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET en el entorno.");
  return new TextEncoder().encode(s);
}

export interface SessionData {
  playerId: string;
  name: string;
  isAdmin: boolean;
}

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ name: data.name, isAdmin: data.isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.playerId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      playerId: payload.sub,
      name: String(payload.name ?? ""),
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}

/** Lee la sesión del request actual (Server Component / Action / Route). */
export async function getSession(): Promise<SessionData | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verifySession(token) : null;
}

/** Setea la cookie de sesión. Solo en Server Action / Route Handler. */
export async function setSessionCookie(data: SessionData): Promise<void> {
  const token = await signSession(data);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Cierra sesión. Solo en Server Action / Route Handler. */
export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
