import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listVisitorEvents, type VisitorEvent } from "@/lib/admin.functions";
import { Page, PageHeader, Panel } from "@/components/jarvis/Shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Jarvis Activity Console" },
      {
        name: "description",
        content: "Private console showing every message, upload, IP address and device that reached Jarvis.",
      },
      { property: "og:title", content: "Jarvis Activity Console" },
      { property: "og:description", content: "Messages, uploads, IP addresses and devices in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Filter = "all" | "message" | "upload" | "visit";

function AdminPage() {
  const navigate = useNavigate();
  const load = useServerFn(listVisitorEvents);
  const [events, setEvents] = useState<VisitorEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [filter, setFilter] = useState<Filter>("all");

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      void navigate({ to: "/auth" });
      return;
    }
    try {
      const res = await load({ data: { limit: 300 } });
      setEvents(res.events);
      setState("ready");
    } catch {
      setState("denied");
    }
  }, [load, navigate]);


  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shown = events.filter((e) => filter === "all" || e.event_type === filter);
  const sessions = new Set(events.map((e) => e.session_id)).size;

  return (
    <Page padBottom={false}>
      <PageHeader
        title="Activity console"
        subtitle="Everything people send Jarvis — text, files, images — with their IP and device."
      />

      {state === "loading" && <Panel>Loading activity…</Panel>}

      {state === "denied" && (
        <Panel>
          <p className="text-sm text-foreground">This account isn't an admin.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Admin access is granted server-side only. Sign in with the operator account.

          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/auth" });
            }}
            className="glass-soft mt-4 rounded-full px-4 py-2 text-xs"
          >
            Sign out
          </button>
        </Panel>
      )}

      {state === "ready" && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Panel className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Events</p>
              <p className="text-2xl font-medium text-foreground">{events.length}</p>
            </Panel>
            <Panel className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Visitors</p>
              <p className="text-2xl font-medium text-foreground">{sessions}</p>
            </Panel>
            <Panel className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Uploads</p>
              <p className="text-2xl font-medium text-foreground">
                {events.filter((e) => e.event_type === "upload").length}
              </p>
            </Panel>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["all", "message", "upload", "visit"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "glass-soft rounded-full px-3.5 py-1.5 text-[11px] capitalize",
                  filter === f && "bg-primary text-primary-foreground",
                )}
              >
                {f}
              </button>
            ))}
            <button onClick={() => void refresh()} className="glass-soft rounded-full px-3.5 py-1.5 text-[11px]">
              Refresh
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                void navigate({ to: "/auth" });
              }}
              className="glass-soft ml-auto rounded-full px-3.5 py-1.5 text-[11px]"
            >
              Sign out
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {shown.length === 0 && <Panel>No activity recorded yet.</Panel>}
            {shown.map((e) => (
              <Panel key={e.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="glass-soft rounded-full px-2.5 py-1 capitalize text-foreground/90">
                    {e.event_type}
                  </span>
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                  <span>· IP {e.ip_address ?? "unknown"}</span>
                  <span>
                    · {e.device ?? "?"} / {e.os ?? "?"} / {e.browser ?? "?"}
                  </span>
                  {e.screen && <span>· {e.screen}</span>}
                  {e.language && <span>· {e.language}</span>}
                  {e.page_path && <span>· {e.page_path}</span>}
                  <span className="ml-auto font-mono">{e.session_id.slice(0, 8)}</span>
                </div>

                {e.content && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{e.content}</p>
                )}

                {e.file_path && (
                  <div className="mt-3 flex items-center gap-3">
                    {e.file_url && (e.file_type ?? "").startsWith("image/") && (
                      <img
                        src={e.file_url}
                        alt={e.file_name ?? "Uploaded image"}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    )}
                    <div className="min-w-0 text-xs">
                      <p className="truncate text-foreground">{e.file_name}</p>
                      <p className="text-muted-foreground">
                        {e.file_type ?? "unknown"} · {Math.round((e.file_size ?? 0) / 1024)} KB
                      </p>
                      {e.file_url && (
                        <a
                          href={e.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan hover:underline"
                        >
                          Open file
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {e.user_agent && (
                  <p className="mt-2 truncate text-[10px] text-muted-foreground">{e.user_agent}</p>
                )}
              </Panel>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
