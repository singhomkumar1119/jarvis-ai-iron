import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/jarvis/ChatMessage";
import { InputBar } from "@/components/jarvis/InputBar";
import { Page, PageHeader } from "@/components/jarvis/Shell";
import { useJarvis } from "@/lib/jarvis-store";

export const Route = createFileRoute("/_authenticated/terminal")({
  head: () => ({
    meta: [
      { title: "Terminal — Jarvis" },
      {
        name: "description",
        content: "A monospaced developer console for Jarvis with syntax-highlighted output.",
      },
      { property: "og:title", content: "Terminal — Jarvis" },
      { property: "og:description", content: "Run technical commands through Jarvis in terminal mode." },
    ],
  }),
  component: Terminal,
});

function Terminal() {
  const { messages, retryLast, stop } = useJarvis();
  const list = messages.filter((m) => m.channel === "terminal");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <Page>
      <PageHeader title="Terminal" subtitle="Developer mode · monospaced, syntax highlighted" />
      <div className="glass rounded-3xl p-4">
        <div className="mb-4 flex items-center gap-1.5 border-b border-border pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/80" />
          <span className="ml-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            jarvis://sandbox
          </span>
        </div>
        <div className="space-y-4">
          {list.length === 0 && (
            <p className="font-mono text-[13px] text-muted-foreground">
              jarvis &gt; awaiting command…
            </p>
          )}
          {list.map((m) => (
            <ChatMessage key={m.id} message={m} onRetry={() => retryLast("terminal")} onStop={stop} />
          ))}
          <div ref={endRef} />
        </div>
      </div>
      <InputBar channel="terminal" />
    </Page>
  );
}
