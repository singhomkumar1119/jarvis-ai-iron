import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed, Loader2, TriangleAlert } from "lucide-react";
import { Page, PageHeader, Panel } from "@/components/jarvis/Shell";
import { useJarvis, type Task } from "@/lib/jarvis-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Jarvis" },
      { name: "description", content: "Track what Jarvis is working on, with live progress for each task." },
      { property: "og:title", content: "Tasks — Jarvis" },
      { property: "og:description", content: "Live progress for everything Jarvis is running." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tasks,
});

const ICONS = {
  queued: CircleDashed,
  running: Loader2,
  done: CheckCircle2,
  failed: TriangleAlert,
} as const;

const TONE: Record<Task["state"], string> = {
  queued: "text-off",
  running: "text-electric",
  done: "text-ok",
  failed: "text-bad",
};

function Tasks() {
  const { tasks } = useJarvis();

  return (
    <Page padBottom={false}>
      <PageHeader title="Tasks" subtitle="What Jarvis is working on right now" />
      <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">Active and queued tasks</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {tasks.map((t) => {
          const Icon = ICONS[t.state];
          return (
            <Panel key={t.id} className="animate-rise">
              <div className="flex items-start gap-3">
                <Icon
                  className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", TONE[t.state], t.state === "running" && "animate-spin")}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-foreground">{t.title}</h3>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{t.detail}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${t.progress}%`,
                        background: "linear-gradient(90deg, var(--electric), var(--cyan))",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {t.state} · {t.progress}%
                  </p>
                </div>
              </div>
            </Panel>
          );
        })}
        {tasks.length === 0 && (
          <Panel className="sm:col-span-2 text-center text-sm text-muted-foreground">
            No tasks yet. Create one from the plus menu.
          </Panel>
        )}
      </div>
    </Page>
  );
}
