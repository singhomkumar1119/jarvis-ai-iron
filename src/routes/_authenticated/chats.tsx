import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/jarvis/ChatMessage";
import { InputBar } from "@/components/jarvis/InputBar";
import { Page, PageHeader } from "@/components/jarvis/Shell";
import { useJarvis } from "@/lib/jarvis-store";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({
    meta: [
      { title: "Chats — Jarvis" },
      { name: "description", content: "Your conversation history with Jarvis in a calm glass interface." },
      { property: "og:title", content: "Chats — Jarvis" },
      { property: "og:description", content: "Conversation history with Jarvis, streamed in real time." },
    ],
  }),
  component: Chats,
});

function Chats() {
  const { messages, retryLast, stop, activity } = useJarvis();
  const list = messages.filter((m) => m.channel === "chat");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <Page>
      <PageHeader title="Chats" subtitle={`${list.length} messages · Jarvis is ${activity}`} />
      <div className="space-y-5">
        {list.length === 0 && (
          <p className="glass rounded-3xl px-5 py-10 text-center text-sm text-muted-foreground">
            No conversation yet. Say something and Jarvis will pick it up.
          </p>
        )}
        {list.map((m) => (
          <ChatMessage key={m.id} message={m} onRetry={() => retryLast("chat")} onStop={stop} />
        ))}
        <div ref={endRef} />
      </div>
      <InputBar channel="chat" />
    </Page>
  );
}
