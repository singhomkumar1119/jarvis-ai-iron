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

function greetingFor(date: Date) {
  const h = date.getHours();
  const part = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, sir. All systems are online. How may I assist you today?`;
}

function Home() {
  const { activity, settings, booted, toggleListening, stop, setActivity } = useJarvis();
  const copy = STATUS_COPY[activity] ?? STATUS_COPY["idle"]!;
  const [greeting, setGreeting] = useState<string | null>(null);
  const greeted = useRef(false);

  useEffect(() => {
    if (!booted || greeted.current) return;
    greeted.current = true;
    let seen = false;
    try {
      seen = sessionStorage.getItem("jarvis:greeted") === "1";
      sessionStorage.setItem("jarvis:greeted", "1");
    } catch {
      /* ignore */
    }
    if (seen) return;
    const line = greetingFor(new Date());
    setGreeting(line);
    if (!settings.speakReplies) return;
    const t = setTimeout(() => {
      setActivity("speaking");
      speak(line, {
        voice: settings.voice,
        rate: settings.voiceSpeed,
        tone: settings.voiceTone,
        onEnd: () => setActivity("idle"),
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

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
          Jarvis — Your Cinematic AI Assistant
        </h1>
        <p className="mt-3 text-base text-foreground/90">{copy.title}</p>
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
