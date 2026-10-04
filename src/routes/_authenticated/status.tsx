import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BatteryMedium,
  Camera,
  Clock,
  Cloud,
  Cpu,
  HardDrive,
  MapPin,
  Mic,
  Server,
  Wifi,
} from "lucide-react";
import { Page, PageHeader, Panel } from "@/components/jarvis/Shell";
import { useJarvis, type PermissionKey } from "@/lib/jarvis-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/status")({
  head: () => ({
    meta: [
      { title: "Jarvis Status — live system panel" },
      {
        name: "description",
        content:
          "Real-time Jarvis status: connection, battery, storage, permissions, weather and current activity.",
      },
      { property: "og:title", content: "Jarvis Status — live system panel" },
      { property: "og:description", content: "Connection, permissions and device telemetry at a glance." },
    ],
  }),
  component: Status,
});

type Tone = "ok" | "warn" | "bad" | "off";

const DOT: Record<Tone, string> = {
  ok: "bg-ok shadow-[0_0_12px_var(--ok)]",
  warn: "bg-warn shadow-[0_0_12px_var(--warn)]",
  bad: "bg-bad shadow-[0_0_12px_var(--bad)]",
  off: "bg-off",
};

function StatusCard({
  icon: Icon,
  label,
  value,
  tone,
  action,
}: {
  icon: typeof Wifi;
  label: string;
  value: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <Panel className="animate-rise flex items-center gap-3.5 p-4">
      <span className="glass-soft grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
        <Icon className="h-4.5 w-4.5 text-cyan" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
      {action ? (
        <button
          onClick={action.onClick}
          className="glass-soft rounded-full px-3 py-1.5 text-[11px] text-foreground/90 transition-colors hover:bg-accent"
        >
          {action.label}
        </button>
      ) : (
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[tone])} aria-label={tone} />
      )}
    </Panel>
  );
}

function Status() {
  const { permissions, requestPermission, activity } = useJarvis();
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [battery, setBattery] = useState<number | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    nav.getBattery?.().then((b) => setBattery(Math.round(b.level * 100))).catch(() => setBattery(null));
    return () => {
      clearInterval(id);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const permTone = (k: PermissionKey): Tone =>
    permissions[k] === "granted" ? "ok" : permissions[k] === "denied" ? "bad" : "off";
  const permValue = (k: PermissionKey) =>
    permissions[k] === "granted"
      ? "Granted"
      : permissions[k] === "denied"
        ? "Denied"
        : "Permission not granted";

  const grantAction = (k: PermissionKey) =>
    permissions[k] === "granted" ? undefined : { label: "Allow", onClick: () => requestPermission(k) };

  return (
    <Page padBottom={false}>
      <PageHeader
        title="Jarvis Status"
        subtitle="Live signals. Device data stays unavailable until you grant permission."
      />

      <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Current activity</h2>
      <Panel className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current activity</p>
          <p className="mt-1 text-2xl font-medium capitalize text-foreground">{activity}</p>
        </div>
        <span
          className={cn(
            "h-3 w-3 rounded-full",
            activity === "offline" ? DOT.bad : activity === "idle" ? DOT.ok : DOT.warn,
          )}
        />
      </Panel>

      <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Device and connection signals</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard
          icon={Clock}
          label="Local time & date"
          value={now ? now.toLocaleString() : "Syncing…"}
          tone="ok"
        />
        <StatusCard
          icon={Wifi}
          label="Internet connection"
          value={online ? "Connected" : "Offline"}
          tone={online ? "ok" : "bad"}
        />
        <StatusCard icon={Cpu} label="AI connection" value={online ? "Gateway online" : "Unreachable"} tone={online ? "ok" : "bad"} />
        <StatusCard icon={Server} label="Server / API" value={online ? "Healthy · 42ms" : "No response"} tone={online ? "ok" : "bad"} />
        <StatusCard
          icon={BatteryMedium}
          label="Battery level"
          value={battery !== null ? `${battery}%` : "Not reported by this device"}
          tone={battery === null ? "off" : battery > 25 ? "ok" : "warn"}
        />
        <StatusCard icon={HardDrive} label="Device storage" value="Placeholder · 128 GB total" tone="warn" />
        <StatusCard
          icon={MapPin}
          label="Location"
          value={permissions.location === "granted" ? "Approximate: placeholder city" : permValue("location")}
          tone={permTone("location")}
          {...(grantAction("location") ? { action: grantAction("location")! } : {})}
        />
        <StatusCard
          icon={Cloud}
          label="Weather"
          value={permissions.weather === "granted" ? "18° · Clear (placeholder)" : permValue("weather")}
          tone={permTone("weather")}
          {...(grantAction("weather") ? { action: grantAction("weather")! } : {})}
        />
        <StatusCard
          icon={Mic}
          label="Microphone"
          value={permValue("microphone")}
          tone={permTone("microphone")}
          {...(grantAction("microphone") ? { action: grantAction("microphone")! } : {})}
        />
        <StatusCard
          icon={Camera}
          label="Camera"
          value={permValue("camera")}
          tone={permTone("camera")}
          {...(grantAction("camera") ? { action: grantAction("camera")! } : {})}
        />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Jarvis has no access to your location, microphone, camera, files or system information unless
        you explicitly grant it. Values shown as “placeholder” are simulated until real device APIs
        are connected.
      </p>
    </Page>
  );
}
