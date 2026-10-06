import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function makeOwnerToken(secret: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  return `${exp}.${sign(`owner:${exp}`, secret)}`;
}

export function safeEqual(x: string, y: string): boolean {
  const a = Buffer.from(x);
  const b = Buffer.from(y);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyOwnerToken(token: string, secret: string): boolean {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(token.slice(dot + 1), sign(`owner:${exp}`, secret));
}
