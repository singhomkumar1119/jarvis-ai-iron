import { createClient } from "@supabase/supabase-js";

/** Verifies the request's bearer token and returns the signed-in user id, or null. */
export async function getRequestUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return String(data.claims.sub);
}

export function unauthorized(message = "Please sign in to use Jarvis."): Response {
  return new Response(message, { status: 401 });
}
