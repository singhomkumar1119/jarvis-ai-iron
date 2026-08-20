import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Activity = "idle" | "listening" | "thinking" | "speaking" | "offline";

export type Attachment = { id: string; name: string; kind: "file" | "image" | "document" };

export type Message = {
  id: string;
  role: "user" | "jarvis";
  channel: "chat" | "terminal";
  text: string;
  code?: { lang: string; source: string } | undefined;
  createdAt: number;
  streaming?: boolean | undefined;
  attachments?: Attachment[] | undefined;
};

export type Task = {
  id: string;
  title: string;
  detail: string;
  progress: number;
  state: "queued" | "running" | "done" | "failed";
};

export type Settings = {
  personality: "concise" | "balanced" | "playful" | "technical";
  voice: "atlas" | "nova" | "orion" | "lumen";
  voiceSpeed: number;
  voiceTone: number;
  theme: "dark" | "light" | "auto";
  animationIntensity: number;
  blobStyle: "aurora" | "plasma" | "glacier" | "ember";
  reduceMotion: boolean;
  notifications: boolean;
  saveHistory: boolean;
};

export type PermissionKey = "location" | "microphone" | "camera" | "files" | "weather";
export type PermissionState = "granted" | "denied" | "prompt";

const DEFAULT_SETTINGS: Settings = {
  personality: "balanced",
  voice: "atlas",
  voiceSpeed: 1,
  voiceTone: 0.5,
  theme: "dark",
  animationIntensity: 0.8,
  blobStyle: "aurora",
  reduceMotion: false,
  notifications: true,
  saveHistory: true,
};

const uid = () => Math.random().toString(36).slice(2, 10);

const REPLIES = [
  "Understood. I've mapped the request and prepared a plan — here is the short version, with detail on request.",
  "Working from what's available locally. I don't have access to external device data unless you grant permission in Jarvis Status.",
  "Done. I kept the summary tight; ask me to expand any step and I'll go deeper.",
  "Here's my read: the fastest path is to isolate the change, verify it, then widen the scope.",
];

const TERMINAL_REPLIES: { text: string; code?: { lang: string; source: string } }[] = [
  {
    text: "Simulated run complete. Output below.",
    code: {
      lang: "bash",
      source: "$ jarvis status --all\n core        online\n gateway     reachable (42ms)\n sandbox     ready\n sessions    1 active",
    },
  },
  {
    text: "Scaffolded a handler for you.",
    code: {
      lang: "ts",
      source:
        'export async function handler(req: Request) {\n  const { prompt } = await req.json();\n  return Response.json({ ok: true, prompt });\n}',
    },
  },
];

type Ctx = {
  messages: Message[];
  tasks: Task[];
  activity: Activity;
  settings: Settings;
  permissions: Record<PermissionKey, PermissionState>;
  booted: boolean;
  setBooted: (v: boolean) => void;
  send: (text: string, channel: "chat" | "terminal", attachments?: Attachment[]) => void;
  retryLast: (channel: "chat" | "terminal") => void;
  stop: () => void;
  clearHistory: () => void;
  setActivity: (a: Activity) => void;
  toggleListening: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  requestPermission: (key: PermissionKey) => void;
  revokePermission: (key: PermissionKey) => void;
  addTask: (title: string) => void;
};

const JarvisContext = createContext<Ctx | null>(null);

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "jarvis",
      channel: "chat",
      text: "Systems nominal. I'm running locally with placeholder telemetry until you grant permissions.",
      createdAt: Date.now() - 60000,
    },
  ]);
  const [tasks, setTasks] = useState<Task[]>([
    { id: uid(), title: "Index knowledge base", detail: "1,204 documents", progress: 100, state: "done" },
    { id: uid(), title: "Summarize weekly briefing", detail: "Waiting on source access", progress: 42, state: "running" },
    { id: uid(), title: "Draft release notes", detail: "Queued behind briefing", progress: 0, state: "queued" },
  ]);
  const [activity, setActivity] = useState<Activity>("idle");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [permissions, setPermissions] = useState<Record<PermissionKey, PermissionState>>({
    location: "prompt",
    microphone: "prompt",
    camera: "prompt",
    files: "prompt",
    weather: "prompt",
  });
  const [booted, setBootedState] = useState(false);
  const setBooted = useCallback((v: boolean) => {
    setBootedState(v);
    try {
      if (v) sessionStorage.setItem("jarvis:booted", "1");
    } catch {
      /* ignore */
    }
  }, []);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastPrompt = useRef<Record<string, string>>({});

  // Only play the cinematic entrance once per session.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("jarvis:booted")) setBootedState(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist settings + history locally (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("jarvis:settings");
      if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("jarvis:settings", JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    const prefersLight =
      settings.theme === "auto" && window.matchMedia("(prefers-color-scheme: light)").matches;
    root.classList.toggle("light", settings.theme === "light" || prefersLight);
    root.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings.theme, settings.reduceMotion]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const respond = useCallback(
    (prompt: string, channel: "chat" | "terminal") => {
      clearTimers();
      setActivity("thinking");
      const id = uid();
      const payload =
        channel === "terminal"
          ? TERMINAL_REPLIES[Math.floor(Math.random() * TERMINAL_REPLIES.length)]!
          : {
              text: REPLIES[Math.floor(Math.random() * REPLIES.length)]!,
              code: undefined as { lang: string; source: string } | undefined,
            };

      timers.current.push(
        setTimeout(() => {
          setActivity("speaking");
          setMessages((m) => [
            ...m,
            { id, role: "jarvis", channel, text: "", createdAt: Date.now(), streaming: true },
          ]);
          const words = payload.text.split(" ");
          words.forEach((_, i) => {
            timers.current.push(
              setTimeout(() => {
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === id ? { ...msg, text: words.slice(0, i + 1).join(" ") } : msg,
                  ),
                );
              }, i * 55),
            );
          });
          timers.current.push(
            setTimeout(
              () => {
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === id ? { ...msg, streaming: false, code: payload.code } : msg,
                  ),
                );
                setActivity("idle");
              },
              words.length * 55 + 260,
            ),
          );
        }, 900),
      );
    },
    [clearTimers],
  );

  const send = useCallback(
    (text: string, channel: "chat" | "terminal", attachments?: Attachment[]) => {
      const trimmed = text.trim();
      if (!trimmed && !attachments?.length) return;
      lastPrompt.current[channel] = trimmed;
      setMessages((m) => [
        ...m,
        { id: uid(), role: "user", channel, text: trimmed, createdAt: Date.now(), attachments },
      ]);
      respond(trimmed, channel);
    },
    [respond],
  );

  const retryLast = useCallback(
    (channel: "chat" | "terminal") => {
      const prompt = lastPrompt.current[channel];
      if (!prompt) return;
      setMessages((m) => {
        const idx = [...m].reverse().findIndex((x) => x.channel === channel && x.role === "jarvis");
        if (idx === -1) return m;
        const realIdx = m.length - 1 - idx;
        return m.filter((_, i) => i !== realIdx);
      });
      respond(prompt, channel);
    },
    [respond],
  );

  const stop = useCallback(() => {
    clearTimers();
    setMessages((m) => m.map((msg) => (msg.streaming ? { ...msg, streaming: false } : msg)));
    setActivity("idle");
  }, [clearTimers]);

  const clearHistory = useCallback(() => {
    clearTimers();
    setMessages([]);
    setActivity("idle");
  }, [clearTimers]);

  const toggleListening = useCallback(() => {
    setActivity((a) => (a === "listening" ? "idle" : "listening"));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const requestPermission = useCallback((key: PermissionKey) => {
    setPermissions((p) => ({ ...p, [key]: "granted" }));
  }, []);

  const revokePermission = useCallback((key: PermissionKey) => {
    setPermissions((p) => ({ ...p, [key]: "denied" }));
  }, []);

  const addTask = useCallback((title: string) => {
    setTasks((t) => [
      { id: uid(), title, detail: "Created from the plus menu", progress: 0, state: "queued" },
      ...t,
    ]);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      messages,
      tasks,
      activity,
      settings,
      permissions,
      booted,
      setBooted,
      send,
      retryLast,
      stop,
      clearHistory,
      setActivity,
      toggleListening,
      updateSettings,
      requestPermission,
      revokePermission,
      addTask,
    }),
    [
      messages,
      tasks,
      activity,
      settings,
      permissions,
      booted,
      setBooted,
      send,
      retryLast,
      stop,
      clearHistory,
      toggleListening,
      updateSettings,
      requestPermission,
      revokePermission,
      addTask,
    ],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}

export function useJarvis() {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error("useJarvis must be used inside JarvisProvider");
  return ctx;
}
