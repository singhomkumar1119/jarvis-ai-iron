import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Camera,
  FileText,
  Image as ImageIcon,
  ListPlus,
  Mic,
  MonitorUp,
  Paperclip,
  Plus,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJarvis, type Attachment } from "@/lib/jarvis-store";
import { startRecognition, speechRecognitionSupported, type Recognizer } from "@/lib/speech";
import { toast } from "sonner";

const MENU = [
  { key: "file", label: "Add file", icon: Paperclip },
  { key: "photo", label: "Add photo", icon: ImageIcon },
  { key: "camera", label: "Take a photo", icon: Camera },
  { key: "document", label: "Upload document", icon: FileText },
  { key: "screen", label: "Share screen", icon: MonitorUp },
  { key: "task", label: "Create task", icon: ListPlus },
] as const;

export function InputBar({ channel }: { channel: "chat" | "terminal" }) {
  const { send, activity, toggleListening, stop, addTask, permissions, requestPermission } =
    useJarvis();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<Attachment[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  const attach = (files: FileList | null, kind: Attachment["kind"]) => {
    if (!files?.length) return;
    setPending((p) => [
      ...p,
      ...Array.from(files).map((f) => ({ id: `${f.name}-${f.size}`, name: f.name, kind })),
    ]);
  };

  const handleMenu = (key: (typeof MENU)[number]["key"]) => {
    setMenuOpen(false);
    if (key === "file") fileRef.current?.click();
    if (key === "photo") imageRef.current?.click();
    if (key === "camera") {
      if (permissions.camera !== "granted") {
        requestPermission("camera");
        toast("Camera access granted for this session");
      }
      cameraRef.current?.click();
    }
    if (key === "document") fileRef.current?.click();
    if (key === "screen") toast("Screen sharing isn't connected yet", { description: "Simulated in this preview." });
    if (key === "task") {
      addTask(value.trim() || "New task from Jarvis");
      setValue("");
      toast("Task created");
    }
  };

  const submit = () => {
    if (!value.trim() && !pending.length) return;
    send(value, channel, pending.length ? pending : undefined);
    setValue("");
    setPending([]);
  };

  const busy = activity === "thinking" || activity === "speaking";

  return (
    <div
      ref={wrapRef}
      className="pointer-events-auto fixed bottom-24 left-1/2 z-40 w-[min(760px,calc(100%-1.5rem))] -translate-x-1/2"
    >
      {/* Plus menu — morphs out of the plus button */}
      <div
        className={cn(
          "glass absolute bottom-[calc(100%+0.6rem)] left-0 w-60 origin-bottom-left overflow-hidden rounded-3xl p-1.5 transition-all duration-400",
          menuOpen
            ? "pointer-events-auto scale-100 opacity-100 blur-0"
            : "pointer-events-none scale-75 opacity-0 blur-sm",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
        role="menu"
        aria-hidden={!menuOpen}
      >
        {MENU.map(({ key, label, icon: Icon }, i) => (
          <button
            key={key}
            role="menuitem"
            onClick={() => handleMenu(key)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground"
            style={{ transitionDelay: menuOpen ? `${i * 22}ms` : "0ms" }}
          >
            <Icon className="h-4 w-4 text-cyan" />
            {label}
          </button>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {pending.map((a) => (
            <button
              key={a.id}
              onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))}
              className="glass-soft rounded-full px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {a.name} ✕
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "glass glass-sheen flex items-end gap-2 rounded-[1.75rem] p-2 transition-shadow duration-300",
          focused && "focus-glow",
        )}
      >
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Attachments and actions"
          aria-expanded={menuOpen}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-foreground/80 transition-all duration-300 hover:bg-accent active:scale-90"
        >
          <Plus className={cn("h-5 w-5 transition-transform duration-400", menuOpen && "rotate-[135deg]")} />
        </button>

        <textarea
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={channel === "terminal" ? "jarvis > run a command…" : "Message Jarvis…"}
          className={cn(
            "max-h-32 flex-1 resize-none bg-transparent px-1 py-2.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground",
            channel === "terminal" && "font-mono text-[13.5px]",
          )}
        />

        <button
          onClick={() => {
            if (permissions.microphone !== "granted") {
              requestPermission("microphone");
              toast("Microphone access granted for this session");
            }
            toggleListening();
          }}
          aria-label={activity === "listening" ? "Stop listening" : "Start voice input"}
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border transition-all duration-300 active:scale-90",
            activity === "listening"
              ? "bg-primary text-primary-foreground shadow-[0_0_30px_-4px_var(--electric)]"
              : "text-foreground/80 hover:bg-accent",
          )}
        >
          <Mic className="h-[18px] w-[18px]" />
        </button>

        <button
          onClick={busy ? stop : submit}
          aria-label={busy ? "Stop generating" : "Send message"}
          className={cn(
            "grid h-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-all duration-300 active:scale-90",
            busy || value.trim() || pending.length
              ? "w-10 scale-100 opacity-100"
              : "w-0 scale-50 opacity-0",
          )}
        >
          {busy ? <Square className="h-4 w-4" /> : <ArrowUp className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <input ref={fileRef} type="file" multiple hidden onChange={(e) => attach(e.target.files, "file")} />
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => attach(e.target.files, "image")}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => attach(e.target.files, "image")}
      />
    </div>
  );
}
