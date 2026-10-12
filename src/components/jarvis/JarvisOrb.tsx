import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/jarvis-store";

const STYLE_TINT: Record<string, [string, string]> = {
  aurora: ["var(--electric)", "var(--violet)"],
  plasma: ["var(--violet)", "var(--bad)"],
  glacier: ["var(--cyan)", "var(--electric)"],
  ember: ["var(--warn)", "var(--violet)"],
};

type Props = {
  activity: Activity;
  intensity?: number;
  blobStyle?: string;
  reduceMotion?: boolean;
  size?: number;
  onPress?: () => void;
};

/** The Jarvis presence: a translucent, organic, light-refracting orb. */
export function JarvisOrb({
  activity,
  intensity = 0.8,
  blobStyle = "aurora",
  reduceMotion = false,
  size = 300,
  onPress,
}: Props) {
  const [tintA, tintB] = STYLE_TINT[blobStyle] ?? STYLE_TINT["aurora"]!;
  const [wave, setWave] = useState<number[]>(() => Array.from({ length: 28 }, () => 0.2));

  useEffect(() => {
    if (activity !== "speaking" || reduceMotion) return;
    const id = setInterval(() => {
      setWave((w) => w.map((_, i) => 0.18 + Math.abs(Math.sin(Date.now() / 220 + i / 2)) * 0.82));
    }, 90);
    return () => clearInterval(id);
  }, [activity, reduceMotion]);

  const scale = useMemo(() => {
    if (activity === "listening") return 1.06;
    if (activity === "speaking") return 1.03;
    if (activity === "offline") return 0.94;
    return 1;
  }, [activity]);

  const animated = !reduceMotion && intensity > 0.05;

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label="Jarvis orb"
      className="group relative grid shrink-0 place-items-center rounded-full outline-none focus-visible:focus-glow"
      style={{ width: `min(${size}px, 68vw, 36dvh)`, aspectRatio: "1", transform: `scale(${scale})`, transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)" }}
    >
      {/* ambient gradient lighting */}
      <span
        aria-hidden
        className={cn("absolute inset-[-28%] rounded-full blur-3xl", animated && "animate-breathe")}
        style={{
          background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${tintA} ${28 + intensity * 34}%, transparent), transparent 62%), radial-gradient(circle at 70% 72%, color-mix(in oklab, ${tintB} ${22 + intensity * 30}%, transparent), transparent 60%)`,
          opacity: activity === "offline" ? 0.25 : 1,
        }}
      />

      {/* thinking light waves */}
      {activity === "thinking" && (
        <span
          aria-hidden
          className={cn("absolute inset-[-6%] rounded-full", animated && "animate-spin-slow")}
          style={{
            background: `conic-gradient(from 0deg, transparent 0 55%, color-mix(in oklab, ${tintA} 55%, transparent) 72%, transparent 88%)`,
            maskImage: "radial-gradient(circle, transparent 58%, black 62%, black 78%, transparent 82%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 58%, black 62%, black 78%, transparent 82%)",
          }}
        />
      )}

      {/* listening pulse */}
      {activity === "listening" && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 0 1px color-mix(in oklab, ${tintA} 60%, transparent), 0 0 90px -10px ${tintA}`,
            animation: animated ? "breathe 2.2s ease-in-out infinite" : undefined,
          }}
        />
      )}

      {/* the glass body */}
      <span
        aria-hidden
        className={cn("relative block h-[74%] w-[74%] overflow-hidden", animated && "animate-drift")}
        style={{
          borderRadius: "48% 52% 55% 45% / 52% 46% 54% 48%",
          background: `radial-gradient(120% 100% at 30% 22%, color-mix(in oklab, var(--glass-highlight) 70%, transparent) 0%, transparent 45%), radial-gradient(90% 90% at 70% 78%, color-mix(in oklab, ${tintB} 40%, transparent), transparent 70%), linear-gradient(160deg, color-mix(in oklab, ${tintA} 26%, transparent), color-mix(in oklab, var(--charcoal) 70%, transparent))`,
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(14px) saturate(170%)",
          boxShadow: `inset 0 2px 22px 0 var(--glass-highlight), inset 0 -18px 42px -20px ${tintB}, 0 30px 90px -40px ${tintA}`,
        }}
      >
        {/* refraction streak */}
        <span
          className="absolute left-[12%] top-[10%] h-[30%] w-[42%] rounded-full opacity-70 blur-md"
          style={{ background: "var(--glass-highlight)" }}
        />
        {/* particles */}
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              left: `${(i * 37) % 88 + 5}%`,
              top: `${(i * 53) % 84 + 8}%`,
              background: i % 2 ? "var(--cyan)" : "var(--glass-highlight)",
              opacity: 0.15 + ((i % 5) / 10) * intensity,
              animation: animated ? `breathe ${5 + (i % 5)}s ease-in-out ${i * 0.3}s infinite` : undefined,
            }}
          />
        ))}
      </span>

      {/* speaking waveform ring */}
      {activity === "speaking" && (
        <span aria-hidden className="pointer-events-none absolute inset-0">
          {wave.map((v, i) => {
            const angle = (i / wave.length) * 360;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 origin-bottom rounded-full"
                style={{
                  width: 2,
                  height: size * 0.09 * v + 6,
                  background: i % 2 ? "var(--cyan)" : "var(--electric)",
                  opacity: 0.75,
                  transform: `rotate(${angle}deg) translateY(-${size * 0.44}px)`,
                  transition: "height 120ms ease-out",
                }}
              />
            );
          })}
        </span>
      )}
    </button>
  );
}
