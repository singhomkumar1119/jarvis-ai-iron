import { useState } from "react";
import { Check, Copy, Maximize2, Minimize2, RotateCcw, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/jarvis-store";

const KEYWORDS =
  /\b(const|let|var|function|return|export|import|async|await|if|else|for|while|new|class|type|interface)\b/g;

function highlight(source: string) {
  return source.split("\n").map((line, i) => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    if (line.trimStart().startsWith("#") || line.trimStart().startsWith("//")) {
      return (
        <div key={i} className="text-muted-foreground">
          {line || " "}
        </div>
      );
    }
    line.replace(KEYWORDS, (m, _g, offset: number) => {
      parts.push(line.slice(last, offset));
      parts.push(
        <span key={`${i}-${offset}`} className="text-violet">
          {m}
        </span>,
      );
      last = offset + m.length;
      return m;
    });
    parts.push(line.slice(last));
    return (
      <div key={i}>
        {line.startsWith("$") ? <span className="text-cyan">{parts}</span> : parts}
      </div>
    );
  });
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" aria-label="Jarvis is responding">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-cyan"
          style={{ animation: `dot 1.2s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">Jarvis is composing…</span>
    </div>
  );
}

export function ChatMessage({
  message,
  onRetry,
  onStop,
}: {
  message: Message;
  onRetry: () => void;
  onStop: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isUser = message.role === "user";
  const mono = message.channel === "terminal";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.code?.source ?? message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={cn("flex w-full animate-rise", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[min(680px,88%)] space-y-2", isUser && "items-end")}>
        {!isUser && (
          <span className="ml-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Jarvis
          </span>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
            mono && "font-mono text-[13px]",
            isUser
              ? "bg-primary text-primary-foreground shadow-[0_18px_40px_-24px_var(--electric)]"
              : message.error
                ? "glass-soft border-bad/40 text-foreground"
                : "glass-soft text-foreground",
          )}
        >
          {message.text || (message.streaming ? <TypingIndicator /> : null)}
          {message.attachments?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.attachments.map((a) => (
                <span
                  key={a.id}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] opacity-90"
                >
                  {a.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {message.code && (
          <div className="glass-soft overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {message.code.lang}
              </span>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={expanded ? "Collapse code" : "Expand code"}
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
            <pre
              className={cn(
                "overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed",
                !expanded && "max-h-40",
              )}
            >
              {highlight(message.code.source)}
            </pre>
          </div>
        )}

        {!isUser && (
          <div className="flex items-center gap-1 pl-1">
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            {message.streaming ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Square className="h-3 w-3" /> Stop
              </button>
            ) : (
              <button
                onClick={onRetry}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] transition-colors hover:text-foreground",
                  message.error ? "text-bad" : "text-muted-foreground",
                )}
              >
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
