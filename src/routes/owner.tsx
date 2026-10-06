import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, LoaderCircle } from "lucide-react";
import { listVisitorEventsWithPin, unlockWithPin } from "@/lib/owner-pin.functions";
import type { VisitorEvent } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KEY = "jarvis-owner-token";

export const Route = createFileRoute("/owner")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Jarvis Owner Access" },
      { name: "description", content: "Private owner entrance to the Jarvis activity console." },
      { property: "og:title", content: "Jarvis Owner Access" },
      { property: "og:description", content: "Private owner entrance to the Jarvis activity console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OwnerPage,
});

function OwnerPage() {
  const unlock = useServerFn(unlockWithPin);
  const list = useServerFn(listVisitorEventsWithPin);
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [events, setEvents] = useState<VisitorEvent[] | null>(null);

  useEffect(() => setToken(sessionStorage.getItem(KEY)), []);

  const load = async (t: string) => {
    try {
      const res = await list({ data: { token: t, limit: 300 } });
      setEvents(res.events);
    } catch {
      sessionStorage.removeItem(KEY);
      setToken(null);
    }
  };

  useEffect(() => {
    if (token) void load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await unlock({ data: { pin } });
      sessionStorage.setItem(KEY, res.token);
      setToken(res.token);
      setPin("");
    } catch (e) {
      setErr((e as Error).message.includes("Wrong") ? "Wrong PIN" : "Too many tries or not available. Wait a minute.");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <main className="auth-stage relative isolate flex min-h-screen items-center justify-center px-5">
        <div aria-hidden className="auth-spectrum absolute inset-0" />
        <section className="auth-glass relative z-10 w-full max-w-sm rounded-[2rem] p-7">
          <KeyRound className="mb-4 h-7 w-7 text-cyan" />
          <h1 className="text-2xl font-semibold text-foreground">Owner access</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your PIN to open the activity console.</p>
          <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <Input type="password" inputMode="numeric" autoComplete="off" aria-label="Owner PIN" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="h-12 rounded-xl bg-glass tracking-[0.3em]" />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <Button type="submit" disabled={busy || !pin} className="h-12 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
              {busy ? <LoaderCircle className="animate-spin" /> : "Unlock"}
            </Button>
          </form>
          <Link to="/auth" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">Back to sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-semibold text-foreground">Activity console</h1>
        <button onClick={() => void load(token)} className="glass-soft rounded-full px-3.5 py-1.5 text-xs">Refresh</button>
        <button onClick={() => { sessionStorage.removeItem(KEY); setToken(null); setEvents(null); }} className="glass-soft rounded-full px-3.5 py-1.5 text-xs">Lock</button>
      </div>
      {!events && <p className="text-sm text-muted-foreground">Loading…</p>}
      {events?.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
      <div className="flex flex-col gap-3">
        {events?.map((e) => (
          <div key={e.id} className="glass-soft rounded-2xl p-4">
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="capitalize text-foreground">{e.event_type}</span>
              <span>{new Date(e.created_at).toLocaleString()}</span>
              <span>· IP {e.ip_address ?? "unknown"}</span>
              <span>· {e.device ?? "?"} / {e.os ?? "?"} / {e.browser ?? "?"}</span>
              {e.page_path && <span>· {e.page_path}</span>}
            </div>
            {e.content && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{e.content}</p>}
            {e.file_path && (
              <div className="mt-2 flex items-center gap-3 text-xs">
                {e.file_url && (e.file_type ?? "").startsWith("image/") && (
                  <img src={e.file_url} alt={e.file_name ?? "Upload"} className="h-20 w-20 rounded-xl object-cover" />
                )}
                <div>
                  <p className="text-foreground">{e.file_name}</p>
                  {e.file_url && <a href={e.file_url} target="_blank" rel="noreferrer" className="text-cyan hover:underline">Open file</a>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
