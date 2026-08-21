import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import { JarvisOrb } from "@/components/jarvis/JarvisOrb";
import { InputBar } from "@/components/jarvis/InputBar";
import { useJarvis } from "@/lib/jarvis-store";
import { speak } from "@/lib/speech";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jarvis — Your cinematic AI assistant" },
      {
        name: "description",
        content:
          "Jarvis is a premium AI assistant with a cinematic glass interface, voice-reactive orb, terminal mode and real-time status.",
      },
      { property: "og:title", content: "Jarvis — Your cinematic AI assistant" },
      {
        property: "og:description",
        content: "A calm, futuristic AI workspace with a voice-reactive orb and liquid-glass controls.",
      },
    ],
  }),
  component: Home,
});

const STATUS_COPY: Record<string, { title: string; sub: string }> = {
  idle: { title: "Jarvis is ready", sub: "Ask me anything" },
  listening: { title: "Jarvis is listening", sub: "Speak — I'm picking it up" },
  thinking: { title: "Jarvis is thinking", sub: "Working through your request" },
  speaking: { title: "Jarvis is speaking", sub: "Tap the orb to interrupt" },
  offline: { title: "Jarvis is offline", sub: "Reconnecting to the gateway" },
};

function Home() {
  const { activity, settings, toggleListening, stop } = useJarvis();
  const copy = STATUS_COPY[activity] ?? STATUS_COPY["idle"]!;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 pb-64 pt-16">
      <Link
        to="/status"
        className="glass-soft absolute right-4 top-6 flex items-center gap-2 rounded-full px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:right-6"
      >
        <ActivityIcon className="h-3.5 w-3.5 text-cyan" />
        Jarvis Status
      </Link>

      <JarvisOrb
        activity={activity}
        intensity={settings.animationIntensity}
        blobStyle={settings.blobStyle}
        reduceMotion={settings.reduceMotion}
        size={320}
        onPress={() => (activity === "speaking" ? stop() : toggleListening())}
      />

      <div className="mt-10 animate-rise text-center">
        <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.sub}</p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {["Summarize my day", "Write a shell script", "Explain this error"].map((s) => (
          <span
            key={s}
            className="glass-soft rounded-full px-4 py-2 text-xs text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>

      <InputBar channel="chat" />
    </main>
  );
}
