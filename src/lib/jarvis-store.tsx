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
import { cancelSpeech, speak, speakableText } from "@/lib/speech";

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
  error?: boolean | undefined;
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
  speakReplies: boolean;
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
  speakReplies: true,
  theme: "dark",
  animationIntensity: 0.8,
  blobStyle: "aurora",
  reduceMotion: false,
  notifications: true,
  saveHistory: true,
};

const uid = () => Math.random().toString(36).slice(2, 10);

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
  setListening: (v: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  requestPermission: (key: PermissionKey) => void;
  revokePermission: (key: PermissionKey) => void;
  setPermission: (key: PermissionKey, state: PermissionState) => void;
  addTask: (title: string) => void;
};

const JarvisContext = createContext<Ctx | null>(null);

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "jarvis",
      channel: "chat",
      text: "Systems nominal. Ask me anything — tap the mic and I'll listen, or type and I'll answer out loud.",
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
  const abortRef = useRef<AbortController | null>(null);
  const lastPrompt = useRef<Record<string, string>>({});
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Only play the cinematic entrance once per session.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("jarvis:booted")) setBootedState(true);
    } catch {
      /* ignore */
    }
  }, []);

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

  const extractCode = (text: string) => {
    const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
    if (!match) return undefined;
    return { lang: match[1] ?? "text", source: (match[2] ?? "").trimEnd() };
  };

  const respond = useCallback(async (channel: "chat" | "terminal") => {
    abortRef.current?.abort();
    cancelSpeech();
    const controller = new AbortController();
    abortRef.current = controller;
    setActivity("thinking");

    const history = messagesRef.current
      .filter((m) => m.channel === channel && m.text.trim() && !m.error)
      .slice(-20)
      .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.text }));

    const id = uid();
    let started = false;
    let full = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          channel,
          personality: settingsRef.current.personality,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = (await res.text().catch(() => "")) || "Jarvis couldn't reach the AI gateway.";
        setMessages((m) => [
          ...m,
          { id, role: "jarvis", channel, text: detail, createdAt: Date.now(), error: true },
        ]);
        setActivity("idle");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        full += chunk;
        if (!started) {
          started = true;
          setMessages((m) => [
            ...m,
            { id, role: "jarvis", channel, text: chunk, createdAt: Date.now(), streaming: true },
          ]);
        } else {
          setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text: full } : msg)));
        }
      }

      const code = extractCode(full);
      setMessages((m) =>
        started
          ? m.map((msg) => (msg.id === id ? { ...msg, text: full, streaming: false, code } : msg))
          : [...m, { id, role: "jarvis", channel, text: full, createdAt: Date.now(), code }],
      );

      const spoken = speakableText(full);
      if (settingsRef.current.speakReplies && spoken) {
        setActivity("speaking");
        speak(spoken, {
          voice: settingsRef.current.voice,
          rate: settingsRef.current.voiceSpeed,
          tone: settingsRef.current.voiceTone,
          onEnd: () => setActivity((a) => (a === "speaking" ? "idle" : a)),
        });
      } else {
        setActivity("idle");
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      setMessages((m) =>
        started
          ? m.map((msg) => (msg.id === id ? { ...msg, streaming: false } : msg))
          : [
              ...m,
              {
                id,
                role: "jarvis",
                channel,
                text: "Jarvis lost the connection. Try again.",
                createdAt: Date.now(),
                error: true,
              },
            ],
      );
      setActivity("idle");
    }
  }, []);

  const send = useCallback(
    (text: string, channel: "chat" | "terminal", attachments?: Attachment[]) => {
      const trimmed = text.trim();
      if (!trimmed && !attachments?.length) return;
      lastPrompt.current[channel] = trimmed;
      const next: Message = {
        id: uid(),
        role: "user",
        channel,
        text: trimmed,
        createdAt: Date.now(),
        attachments,
      };
      messagesRef.current = [...messagesRef.current, next];
      setMessages(messagesRef.current);
      void respond(channel);
    },
    [respond],
  );

  const retryLast = useCallback(
    (channel: "chat" | "terminal") => {
      const idx = [...messagesRef.current].reverse().findIndex((x) => x.channel === channel && x.role === "jarvis");
      if (idx !== -1) {
        const realIdx = messagesRef.current.length - 1 - idx;
        messagesRef.current = messagesRef.current.filter((_, i) => i !== realIdx);
        setMessages(messagesRef.current);
      }
      void respond(channel);
    },
    [respond],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cancelSpeech();
    setMessages((m) => m.map((msg) => (msg.streaming ? { ...msg, streaming: false } : msg)));
    setActivity("idle");
  }, []);

  const clearHistory = useCallback(() => {
    abortRef.current?.abort();
    cancelSpeech();
    setMessages([]);
    setActivity("idle");
  }, []);

  const setListening = useCallback((v: boolean) => {
    setActivity((a) => (v ? "listening" : a === "listening" ? "idle" : a));
  }, []);

  const toggleListening = useCallback(() => {
    setActivity((a) => (a === "listening" ? "idle" : "listening"));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    if (patch.speakReplies === false) cancelSpeech();
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const setPermission = useCallback((key: PermissionKey, state: PermissionState) => {
    setPermissions((p) => ({ ...p, [key]: state }));
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
      setListening,
      updateSettings,
      requestPermission,
      revokePermission,
      setPermission,
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
      setListening,
      updateSettings,
      requestPermission,
      revokePermission,
      setPermission,
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
