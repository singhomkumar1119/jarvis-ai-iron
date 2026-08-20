import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Cinematic entrance: black fade-in, glowing white wordmark, blob forming behind. */
export function BootScreen({ onDone, reduceMotion }: { onDone: () => void; reduceMotion: boolean }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      const t = setTimeout(onDone, 300);
      return () => clearTimeout(t);
    }
    const timers = [
      setTimeout(() => setPhase(1), 250),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(onDone, 3300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone, reduceMotion]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-100 grid place-items-center bg-background transition-all duration-700",
        phase >= 3 && "pointer-events-none scale-105 opacity-0 blur-md",
      )}
    >
      <div className="relative grid place-items-center">
        <div
          aria-hidden
          className={cn(
            "absolute h-[420px] w-[420px] rounded-full blur-3xl transition-all duration-[1600ms] ease-out",
            phase >= 2 ? "scale-100 opacity-100" : "scale-50 opacity-0",
            !reduceMotion && phase >= 2 && "animate-breathe",
          )}
          style={{
            background:
              "radial-gradient(circle at 38% 32%, color-mix(in oklab, var(--electric) 45%, transparent), transparent 60%), radial-gradient(circle at 68% 70%, color-mix(in oklab, var(--violet) 38%, transparent), transparent 62%)",
          }}
        />
        <div
          aria-hidden
          className={cn(
            "absolute h-64 w-64 border transition-all duration-[1400ms] ease-out",
            phase >= 2 ? "scale-100 opacity-100" : "scale-75 opacity-0",
            !reduceMotion && phase >= 2 && "animate-drift",
          )}
          style={{
            borderRadius: "48% 52% 55% 45% / 52% 46% 54% 48%",
            borderColor: "var(--glass-border)",
            background: "color-mix(in oklab, var(--glass) 70%, transparent)",
            backdropFilter: "blur(18px)",
          }}
        />
        <h1
          className={cn(
            "relative select-none text-6xl font-semibold tracking-[0.42em] text-foreground transition-all duration-1000 sm:text-7xl",
            phase >= 1 ? "opacity-100 blur-0" : "translate-y-2 opacity-0 blur-lg",
          )}
          style={{ textShadow: "0 0 42px color-mix(in oklab, var(--foreground) 55%, transparent)" }}
        >
          JARVIS
        </h1>
      </div>
      <p
        className={cn(
          "absolute bottom-24 text-xs uppercase tracking-[0.4em] text-muted-foreground transition-opacity duration-700",
          phase >= 2 ? "opacity-100" : "opacity-0",
        )}
      >
        Initializing
      </p>
    </div>
  );
}
