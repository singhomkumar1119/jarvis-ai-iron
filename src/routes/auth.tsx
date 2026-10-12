import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, LoaderCircle, Mail, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      { name: "description", content: "Enter your private Jarvis AI workspace securely with Google, email, or phone." },
      { property: "og:title", content: "Sign in to Jarvis" },
      { property: "og:description", content: "Secure access to your cinematic personal AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Method = "google" | "email" | "phone";

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [method, setMethod] = useState<Method>("google");
  const [busy, setBusy] = useState(false);

  // email state
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // phone state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const done = () => void navigate({ to: next || "/", replace: true });

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) done();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

  const signInGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      done();
    } catch (err) {
      toast("Google sign-in failed", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const signInEmail = async () => {
    if (!email.trim() || !password) {
      toast("Missing details", { description: "Enter your email and password." });
      return;
    }
    setBusy(true);
    try {
      if (emailMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        done();
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) {
          done();
        } else {
          toast("Check your inbox", { description: "Confirm your email, then sign in." });
          setEmailMode("signin");
        }
      }
    } catch (err) {
      toast("Email sign-in failed", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    if (!phone.trim()) {
      toast("Missing number", { description: "Enter your phone number with country code, e.g. +91…" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
      if (error) throw error;
      setOtpSent(true);
      toast("Code sent", { description: "Enter the 6-digit code from the SMS." });
    } catch (err) {
      toast("Could not send code", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.trim().length < 4) {
      toast("Enter the code", { description: "Type the SMS code you received." });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: otp.trim(), type: "sms" });
      if (error) throw error;
      done();
    } catch (err) {
      toast("Wrong code", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const tabCls = (m: Method) =>
    `flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors ${
      method === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <main className="auth-stage relative isolate flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="auth-spectrum absolute inset-0" />
      <div aria-hidden className="auth-light-streak auth-light-streak-one" />
      <div aria-hidden className="auth-light-streak auth-light-streak-two" />

      <section className="auth-glass relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="auth-scanline" aria-hidden />
        <div className="relative">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-foreground">JARVIS</p>
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> Secure channel
            </span>
          </div>

          <div className="mb-6 grid h-20 w-20 place-items-center rounded-full border border-glass-border bg-glass shadow-[inset_0_1px_0_var(--glass-highlight),0_0_48px_color-mix(in_oklab,var(--cyan)_28%,transparent)]">
            <Sparkles className="h-8 w-8 text-cyan" />
          </div>

          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-cyan">Identity verification</p>
          <h1 className="max-w-sm text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Welcome to <span className="text-gradient">Jarvis.</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Your private AI workspace is waiting. Choose how you want to continue.
          </p>

          <div className="my-6 h-px bg-border" />

          <div className="mb-5 flex gap-1 rounded-2xl border border-glass-border bg-glass p-1" role="tablist" aria-label="Sign-in method">
            <button type="button" role="tab" aria-selected={method === "google"} className={tabCls("google")} onClick={() => setMethod("google")}>
              Google
            </button>
            <button type="button" role="tab" aria-selected={method === "email"} className={tabCls("email")} onClick={() => setMethod("email")}>
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
            <button type="button" role="tab" aria-selected={method === "phone"} className={tabCls("phone")} onClick={() => setMethod("phone")}>
              <Phone className="h-3.5 w-3.5" /> Phone
            </button>
          </div>

          {method === "google" && (
            <Button
              type="button"
              size="lg"
              disabled={busy}
              onClick={() => void signInGoogle()}
              className="group h-14 w-full rounded-2xl bg-foreground text-background shadow-[0_14px_38px_color-mix(in_oklab,var(--electric)_28%,transparent)] hover:bg-foreground/90"
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-background font-semibold text-foreground">G</span>}
              <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
              {!busy && <ArrowRight className="ml-auto transition-transform group-hover:translate-x-1" />}
            </Button>
          )}

          {method === "email" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-glass" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input id="auth-password" type="password" autoComplete={emailMode === "signin" ? "current-password" : "new-password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-glass" />
              </div>
              <Button type="button" size="lg" disabled={busy} onClick={() => void signInEmail()} className="group h-14 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90">
                {busy && <LoaderCircle className="animate-spin" />}
                <span>{busy ? "Please wait…" : emailMode === "signin" ? "Continue with Email" : "Create account"}</span>
                {!busy && <ArrowRight className="ml-auto transition-transform group-hover:translate-x-1" />}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => setEmailMode(emailMode === "signin" ? "signup" : "signin")}
              >
                {emailMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
              </button>
            </div>
          )}

          {method === "phone" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-phone">Phone number</Label>
                <Input id="auth-phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} className="h-12 rounded-xl bg-glass" />
              </div>
              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="auth-otp">SMS code</Label>
                  <Input id="auth-otp" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} className="h-12 rounded-xl bg-glass tracking-[0.4em]" />
                </div>
              )}
              <Button type="button" size="lg" disabled={busy} onClick={() => void (otpSent ? verifyOtp() : sendOtp())} className="group h-14 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90">
                {busy && <LoaderCircle className="animate-spin" />}
                <span>{busy ? "Please wait…" : otpSent ? "Verify & continue" : "Send code"}</span>
                {!busy && <ArrowRight className="ml-auto transition-transform group-hover:translate-x-1" />}
              </Button>
              {otpSent && (
                <button type="button" className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => { setOtpSent(false); setOtp(""); }}>
                  Use a different number
                </button>
              )}
            </div>
          )}

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
