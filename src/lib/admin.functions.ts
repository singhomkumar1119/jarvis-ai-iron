import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VisitorEvent = {
  id: string;
  session_id: string;
  event_type: string;
  channel: string | null;
  content: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  file_path: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  screen: string | null;
  language: string | null;
  page_path: string | null;
  created_at: string;
  file_url?: string | null;
};

async function isAdminUser(
  supabase: { from: (t: "user_roles") => any },
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { admin: await isAdminUser(context.supabase, context.userId) };
  });

export const listVisitorEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(input?.limit ?? 200, 1), 500),
  }))
  .handler(async ({ data, context }): Promise<{ events: VisitorEvent[] }> => {
    if (!(await isAdminUser(context.supabase, context.userId))) {
      throw new Error("Forbidden");
    }


    const { data: rows, error } = await context.supabase
      .from("visitor_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const events = (rows ?? []) as VisitorEvent[];
    const paths = events.map((e) => e.file_path).filter((p): p is string => Boolean(p));
    if (paths.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from("uploads")
        .createSignedUrls(paths, 60 * 60);
      const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      for (const e of events) if (e.file_path) e.file_url = map.get(e.file_path) ?? null;
    }
    return { events };
  });

// Admin roles are seeded server-side only (database migration / trusted script).
// There is intentionally no self-service way to claim the admin role.

