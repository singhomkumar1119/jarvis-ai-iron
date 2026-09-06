/**
 * In-memory, per-IP sliding-window rate limiter shared by the public
 * tracking endpoints. Keeps anonymous callers from flooding the database
 * or filling the private uploads bucket.
 */

export type LimitConfig = {
  /** Requests allowed per rolling minute. */
  perMinute: number;
  /** Requests allowed per rolling day. */
  perDay: number;
  /** Optional byte budget per rolling day (uploads). */
  bytesPerDay?: number;
};

type Entry = { at: number; bytes: number };

const stores = new Map<string, Map<string, Entry[]>>();

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function clientIpFrom(request: Request): string {
  const h = request.headers;
  const fwd = h.get("x-forwarded-for");
  return (
    h.get("cf-connecting-ip") ??
    (fwd ? (fwd.split(",")[0] ?? "").trim() || null : null) ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

export type LimitResult = { ok: true } | { ok: false; retryAfter: number; reason: string };

export function checkRateLimit(
  scope: string,
  request: Request,
  config: LimitConfig,
  bytes = 0,
): LimitResult {
  let store = stores.get(scope);
  if (!store) {
    store = new Map();
    stores.set(scope, store);
  }

  const ip = clientIpFrom(request);
  const now = Date.now();
  const entries = (store.get(ip) ?? []).filter((e) => now - e.at < DAY_MS);

  // Cheap memory guard for a long-lived worker instance.
  if (store.size > 5_000) store.clear();

  const inMinute = entries.filter((e) => now - e.at < MINUTE_MS);
  if (inMinute.length >= config.perMinute) {
    store.set(ip, entries);
    const oldest = inMinute[0]?.at ?? now;
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((MINUTE_MS - (now - oldest)) / 1000)),
      reason: "Too many requests",
    };
  }

  if (entries.length >= config.perDay) {
    store.set(ip, entries);
    return { ok: false, retryAfter: 3600, reason: "Daily limit reached" };
  }

  if (config.bytesPerDay !== undefined) {
    const used = entries.reduce((sum, e) => sum + e.bytes, 0);
    if (used + bytes > config.bytesPerDay) {
      store.set(ip, entries);
      return { ok: false, retryAfter: 3600, reason: "Daily upload limit reached" };
    }
  }

  entries.push({ at: now, bytes });
  store.set(ip, entries);
  return { ok: true };
}

export function limitedResponse(result: Extract<LimitResult, { ok: false }>) {
  return new Response(result.reason, {
    status: 429,
    headers: { "Retry-After": String(result.retryAfter) },
  });
}
