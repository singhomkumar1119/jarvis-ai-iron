import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

function safeNext(value: unknown): string {
  if (typeof value !== "string" || !/^\/(?![\/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/.test(value)) return "";
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = safeNext(s['next']);
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in to Jarvis — Private AI access" },
      { name: "description", content: "Enter your private Jarvis AI workspace securely with your Google account." },
      { property: "og:title", content: "Sign in to Jarvis" },
      { property: "og:description", content: "Secure Google access to your cinematic personal AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});


function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: next || "/", replace: true });
    });
  }, [navigate, next]);

  const signIn = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      void navigate({ to: next || "/", replace: true });
    } catch (err) {
      toast("Google sign-in failed", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-stage relative isolate flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="auth-spectrum absolute inset-0" />
      <div aria-hidden className="auth-light-streak auth-light-streak-one" />
      <div aria-hidden className="auth-light-streak auth-light-streak-two" />

      <section className="auth-glass relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="auth-scanline" aria-hidden />
        <div className="relative">
          <div className="mb-10 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-foreground">JARVIS</p>
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> Secure channel
            </span>
          </div>

          <div className="mb-8 grid h-24 w-24 place-items-center rounded-full border border-glass-border bg-glass shadow-[inset_0_1px_0_var(--glass-highlight),0_0_48px_color-mix(in_oklab,var(--cyan)_28%,transparent)]">
            <Sparkles className="h-9 w-9 text-cyan" />
          </div>

          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-cyan">Identity verification</p>
          <h1 className="max-w-sm text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Welcome to <span className="text-gradient">Jarvis.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Your private AI workspace is waiting. Continue securely with your Google account.
          </p>

          <div className="my-7 h-px bg-border" />

          <Button
            type="button"
            size="lg"
            disabled={busy}
            onClick={() => void signIn()}
            className="group h-14 w-full rounded-2xl bg-foreground text-background shadow-[0_14px_38px_color-mix(in_oklab,var(--electric)_28%,transparent)] hover:bg-foreground/90"
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-background font-semibold text-foreground">G</span>}
            <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
            {!busy && <ArrowRight className="ml-auto transition-transform group-hover:translate-x-1" />}
          </Button>

          <div className="mt-6 flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-ok" /> Encrypted</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-cyan" /> Session remembered</span>
          </div>
        </div>
      </section>

      <p className="absolute bottom-6 z-10 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Personal intelligence · Private by design
      </p>
    </main>
  );
}
