import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity as ActivityIcon, ChevronRight, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Page, PageHeader, Panel } from "@/components/jarvis/Shell";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useJarvis, type PermissionKey, type Settings as S } from "@/lib/jarvis-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Jarvis" },
      {
        name: "description",
        content: "Tune the Jarvis personality, voice, theme, animation intensity, privacy and permissions.",
      },
      { property: "og:title", content: "Settings — Jarvis" },
      { property: "og:description", content: "Personality, voice, theme, motion and privacy controls." },
    ],
  }),
  component: SettingsPage,
});

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="glass-soft flex gap-0.5 rounded-full p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[11px] capitalize transition-all duration-300",
            value === o
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

const PERMS: { key: PermissionKey; label: string }[] = [
  { key: "location", label: "Location access" },
  { key: "microphone", label: "Microphone access" },
  { key: "camera", label: "Camera access" },
  { key: "files", label: "File & photo access" },
  { key: "weather", label: "Weather access" },
];

function SettingsPage() {
  const { settings, updateSettings, permissions, requestPermission, revokePermission, clearHistory } =
    useJarvis();

  const set = <K extends keyof S>(k: K, v: S[K]) => updateSettings({ [k]: v } as Partial<S>);

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Shape how Jarvis looks, sounds and behaves" />

      <div className="space-y-5">
        <Link
          to="/status"
          className="glass glass-sheen flex items-center gap-3 rounded-3xl px-5 py-4 transition-colors hover:bg-accent"
        >
          <ActivityIcon className="h-4.5 w-4.5 text-cyan" />
          <span className="flex-1 text-sm text-foreground">Jarvis Status</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Panel>
          <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Assistant</h2>
          <Row label="Jarvis personality">
            <Segmented
              value={settings.personality}
              options={["concise", "balanced", "playful", "technical"] as const}
              onChange={(v) => set("personality", v)}
            />
          </Row>
          <Row label="Speak replies aloud" hint="Jarvis reads answers using your device voice">
            <Switch aria-label="Speak replies aloud" checked={settings.speakReplies} onCheckedChange={(v) => set("speakReplies", v)} />
          </Row>
          <Row label="Voice">
            <Segmented
              value={settings.voice}
              options={["atlas", "nova", "orion", "lumen"] as const}
              onChange={(v) => set("voice", v)}
            />
          </Row>
          <Row label="Voice speed" hint={`${settings.voiceSpeed.toFixed(2)}×`}>
            <Slider
              aria-label="Voice speed"
              className="w-44"
              min={0.5}
              max={2}
              step={0.05}
              value={[settings.voiceSpeed]}
              onValueChange={([v]) => set("voiceSpeed", v ?? 1)}
            />
          </Row>
          <Row label="Voice tone" hint="Warmer ↔ brighter">
            <Slider
              aria-label="Voice tone"
              className="w-44"
              min={0}
              max={1}
              step={0.05}
              value={[settings.voiceTone]}
              onValueChange={([v]) => set("voiceTone", v ?? 0.5)}
            />
          </Row>
        </Panel>

        <Panel>
          <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Appearance</h2>
          <Row label="Theme" hint="Dark cinematic is the default">
            <Segmented
              value={settings.theme}
              options={["dark", "light", "auto"] as const}
              onChange={(v) => set("theme", v)}
            />
          </Row>
          <Row label="Blob appearance">
            <Segmented
              value={settings.blobStyle}
              options={["aurora", "plasma", "glacier", "ember"] as const}
              onChange={(v) => set("blobStyle", v)}
            />
          </Row>
          <Row label="Animation intensity" hint={`${Math.round(settings.animationIntensity * 100)}%`}>
            <Slider
              aria-label="Animation intensity"
              className="w-44"
              min={0}
              max={1}
              step={0.05}
              value={[settings.animationIntensity]}
              onValueChange={([v]) => set("animationIntensity", v ?? 0.8)}
            />
          </Row>
          <Row label="Reduce motion" hint="Disables blob movement, morphing and transitions">
            <Switch
              aria-label="Reduce motion"
              checked={settings.reduceMotion}
              onCheckedChange={(v) => set("reduceMotion", v)}
            />
          </Row>
          <Row label="Notifications">
            <Switch aria-label="Notifications" checked={settings.notifications} onCheckedChange={(v) => set("notifications", v)} />
          </Row>
        </Panel>

        <Panel>
          <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Privacy & permissions
          </h2>
          {PERMS.map((p) => (
            <Row
              key={p.key}
              label={p.label}
              hint={
                permissions[p.key] === "granted"
                  ? "Granted"
                  : permissions[p.key] === "denied"
                    ? "Denied"
                    : "Not granted — Jarvis has no access"
              }
            >
              <Switch
                aria-label={`Allow ${p.label}`}
                checked={permissions[p.key] === "granted"}
                onCheckedChange={(v) => (v ? requestPermission(p.key) : revokePermission(p.key))}
              />
            </Row>
          ))}
          <Row label="Save chat history" hint="Stored locally on this device only">
            <Switch aria-label="Save chat history" checked={settings.saveHistory} onCheckedChange={(v) => set("saveHistory", v)} />
          </Row>
          <Row label="Clear conversation history">
            <button
              onClick={() => {
                clearHistory();
                toast("Conversation history cleared");
              }}
              className="flex items-center gap-2 rounded-full border border-destructive/40 px-3 py-1.5 text-[11px] text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </Row>
        </Panel>

        <Panel>
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">About Jarvis</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Jarvis v1.0 — an original glass-inspired interface for a personal AI workspace. System
            telemetry is simulated with placeholder data until you connect real APIs and grant
            permissions.
          </p>
        </Panel>
      </div>
    </Page>
  );
}
