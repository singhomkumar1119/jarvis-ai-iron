import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Cpu, Search } from "lucide-react";
import { useJarvis } from "@/lib/jarvis-store";

type ModelOption = { id: string; label: string; provider: "nvidia" | "lovable" };

let cache: { models: ModelOption[]; defaultModel: string } | null = null;

export function ModelPicker() {
  const { settings, updateSettings } = useJarvis();
  const [data, setData] = useState(cache);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetch("/api/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive || !json) return;
        cache = json as { models: ModelOption[]; defaultModel: string };
        setData(cache);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const models = data?.models ?? [];
  const activeId = settings.model || data?.defaultModel || "";
  const active = models.find((m) => m.id === activeId);
  const filtered = query.trim()
    ? models.filter((m) => (m.id + m.label).toLowerCase().includes(query.trim().toLowerCase()))
    : models;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass flex max-w-[16rem] items-center gap-2 rounded-full px-3 py-1.5 text-xs text-foreground/80 transition hover:text-foreground"
      >
        <Cpu className="size-3.5 shrink-0 text-[--color-electric]" />
        <span className="truncate">{active?.label ?? (models.length ? "Select model" : "Loading models…")}</span>
        <ChevronDown className={`size-3.5 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="glass absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl p-2 shadow-2xl">
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No models found.</p>
            )}
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  updateSettings({ model: m.id });
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition hover:bg-white/8"
              >
                <span className="flex-1 truncate">
                  <span className="block truncate text-foreground/90">{m.label}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{m.id}</span>
                </span>
                {m.id === activeId && <Check className="size-3.5 text-[--color-electric]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
