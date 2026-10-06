import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "crypto";
import { checkRateLimit, limitedResponse } from "@/lib/rate-limit";
import type { VisitorEvent } from "@/lib/admin.functions";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function makeToken(secret: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  return `${exp}.${sign(`owner:${exp}`, secret)}`;
}

export function verifyOwnerToken(token: string, secret: string): boolean {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(`owner:${exp}`, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unlockWithPin = createServerFn({ method: "POST" })
  .inputValidator((input: { pin?: string } | undefined) => ({
    pin: String(input?.pin ?? "").slice(0, 64),
  }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const limited = checkRateLimit("owner-pin", request, { perMinute: 5, perDay: 30 });
    if (!limited.ok) throw limitedResponse(limited);

    const secret = process.env["OWNER_PIN"];
    if (!secret) throw new Error("Owner PIN is not configured");

    const a = Buffer.from(data.pin);
    const b = Buffer.from(secret);
    const ok = a.length === b.length && timingSafeEqual(a, b);
    if (!ok) throw new Error("Wrong PIN");

    return { token: makeToken(secret) };
  });

export const listVisitorEventsWithPin = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: string; limit?: number } | undefined) => ({
    token: String(input?.token ?? "").slice(0, 200),
    limit: Math.min(Math.max(input?.limit ?? 200, 1), 500),
  }))
  .handler(async ({ data }): Promise<{ events: VisitorEvent[] }> => {
    const request = getRequest();
    const limited = checkRateLimit("owner-pin", request, { perMinute: 30, perDay: 300 });
    if (!limited.ok) throw limitedResponse(limited);

    const secret = process.env["OWNER_PIN"];
    if (!secret || !verifyOwnerToken(data.token, secret)) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("visitor_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const events = (rows ?? []) as VisitorEvent[];
    const paths = events.map((e) => e.file_path).filter((p): p is string => Boolean(p));
    if (paths.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from("uploads")
        .createSignedUrls(paths, 60 * 60);
      const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      const INLINE_OK = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
      for (const e of events) {
        if (!e.file_path) continue;
        const url = map.get(e.file_path) ?? null;
        e.file_url =
          url && !INLINE_OK.has((e.file_type ?? "").toLowerCase())
            ? `${url}${url.includes("?") ? "&" : "?"}download=`
            : url;
      }
    }
    return { events };
  });
