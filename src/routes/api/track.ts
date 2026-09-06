import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  sessionId: z.string().min(1).max(120),
  eventType: z.enum(["visit", "message", "upload"]),
  channel: z.string().max(40).optional(),
  content: z.string().max(8000).optional(),
  fileName: z.string().max(300).optional(),
  fileType: z.string().max(160).optional(),
  fileSize: z.number().nonnegative().optional(),
  filePath: z.string().max(500).optional(),
  userAgent: z.string().max(600).optional(),
  device: z.string().max(40).optional(),
  browser: z.string().max(40).optional(),
  os: z.string().max(40).optional(),
  screen: z.string().max(40).optional(),
  language: z.string().max(40).optional(),
  pagePath: z.string().max(300).optional(),
});

export function clientIp(request: Request): string | null {
  const h = request.headers;
  const forwarded = h.get("x-forwarded-for");
  return (
    h.get("cf-connecting-ip") ??
    (forwarded ? (forwarded.split(",")[0] ?? "").trim() : null) ??
    h.get("x-real-ip")
  );
}

export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Public endpoint: cap anonymous callers before touching the database.
        const limit = checkRateLimit("track", request, { perMinute: 30, perDay: 1_000 });
        if (!limit.ok) return limitedResponse(limit);

        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });
        const d = parsed.data;


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("visitor_events").insert({
          session_id: d.sessionId,
          event_type: d.eventType,
          channel: d.channel ?? null,
          content: d.content ?? null,
          file_name: d.fileName ?? null,
          file_type: d.fileType ?? null,
          file_size: d.fileSize ?? null,
          file_path: d.filePath ?? null,
          ip_address: clientIp(request),
          user_agent: d.userAgent ?? null,
          device: d.device ?? null,
          browser: d.browser ?? null,
          os: d.os ?? null,
          screen: d.screen ?? null,
          language: d.language ?? null,
          page_path: d.pagePath ?? null,
        });
        if (error) return new Response("Failed to log", { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
