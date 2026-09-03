/** Thin, SSR-safe wrappers around the browser speech APIs. */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

export function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export const speechRecognitionSupported = () => getRecognitionCtor() !== null;

export type Recognizer = {
  stop: () => void;
  abort: () => void;
};

export function startRecognition(handlers: {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
  continuous?: boolean;
}): Recognizer | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
  rec.continuous = handlers.continuous ?? true;
  rec.interimResults = true;
  try {
    rec.maxAlternatives = 1;
  } catch {
    /* ignore */
  }

  let finalText = "";

  rec.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) finalText += (finalText ? " " : "") + transcript.trim();
      else interim += transcript;
    }
    const combined = (finalText + (interim ? " " + interim : "")).trim();
    handlers.onPartial?.(combined);
    if (finalText.trim()) handlers.onFinal?.(finalText.trim());
  };

  rec.onerror = (event: any) => handlers.onError?.(String(event?.error ?? "unknown"));

  rec.onend = () => {
    handlers.onEnd?.();
  };

  try {
    rec.start();
  } catch {
    return null;
  }

  return { stop: () => rec.stop(), abort: () => rec.abort() };
}

export const speechSynthesisSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

const VOICE_HINTS: Record<string, string[]> = {
  atlas: ["daniel", "google uk english male", "male"],
  nova: ["samantha", "google us english", "female"],
  orion: ["alex", "fred", "male"],
  lumen: ["karen", "google uk english female", "female"],
};

function pickVoice(name: string) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const hints = VOICE_HINTS[name] ?? [];
  for (const hint of hints) {
    const match = voices.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

export function cancelSpeech() {
  if (!speechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

export function speak(
  text: string,
  opts: { voice: string; rate: number; tone: number; onEnd?: () => void },
) {
  if (!speechSynthesisSupported() || !text.trim()) {
    opts.onEnd?.();
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(opts.voice);
  if (voice) utter.voice = voice;
  utter.rate = Math.min(2, Math.max(0.5, opts.rate));
  utter.pitch = Math.min(2, Math.max(0, 0.6 + opts.tone * 0.8));
  utter.onend = () => opts.onEnd?.();
  utter.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(utter);
}

/** Strip code fences and markdown so spoken output stays natural. */
export function speakableText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " code block omitted. ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[*_#>]/g, "")
    .trim();
}
