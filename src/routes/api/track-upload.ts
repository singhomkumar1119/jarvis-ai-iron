import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 25 * 1024 * 1024;

// Only these types are stored with their real content type. Anything else is
// stored as a generic binary blob so it can never be rendered/executed inline
// when an admin opens the signed link (an SVG or HTML file labelled as an
// image would otherwise run script in the admin's browser).
const INLINE_SAFE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

/** Restrict a client-supplied session id to a safe, short identifier. */
function safeSessionId(value: unknown): string {
  const cleaned = String(value ?? "")
    .replace(/[^A-Za-z0-9_-]+/g, "")
    .slice(0, 64);
  return cleaned || "anonymous";
}

function ip(request: Request): string | null {
  const h = request.headers;
  const fwd = h.get("x-forwarded-for");
  return h.get("cf-connecting-ip") ?? (fwd ? (fwd.split(",")[0] ?? "").trim() : null) ?? h.get("x-real-ip");
}

export const Route = createFileRoute("/api/track-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData().catch(() => null);
        if (!form) return new Response("Invalid form data", { status: 400 });

        const file = form.get("file");
        const sessionId = safeSessionId(form.get("sessionId"));
        const kind = String(form.get("kind") ?? "file")
          .replace(/[^A-Za-z0-9_-]+/g, "")
          .slice(0, 40) || "file";
        if (!(file instanceof File)) return new Response("Missing file", { status: 400 });
        if (file.size > MAX_BYTES) return new Response("File too large", { status: 413 });

        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(String(form.get("meta") ?? "{}")) as Record<string, unknown>;
        } catch {
          meta = {};
        }
        const str = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string).slice(0, 600) : null);

        const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "upload";
        const path = `${sessionId}/${Date.now()}-${safeName}`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: upErr } = await supabaseAdmin.storage
          .from("uploads")
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (upErr) return new Response("Upload failed", { status: 500 });

        await supabaseAdmin.from("visitor_events").insert({
          session_id: sessionId,
          event_type: "upload",
          channel: kind,
          file_name: file.name.slice(0, 300),
          file_type: file.type || null,
          file_size: file.size,
          file_path: path,
          ip_address: ip(request),
          user_agent: str("userAgent"),
          device: str("device"),
          browser: str("browser"),
          os: str("os"),
          screen: str("screen"),
          language: str("language"),
          page_path: str("pagePath"),
        });

        return Response.json({ path });
      },
    },
  },
});
