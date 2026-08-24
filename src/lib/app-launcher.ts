/**
 * Jarvis app launcher.
 *
 * Jarvis runs inside a browser sandbox, so he can't spawn native desktop
 * binaries. What he *can* do is open any app that exposes a web address or a
 * deep-link URL scheme — which covers virtually every major app. On phones the
 * scheme handoff opens the installed native app; on desktop we fall back to the
 * web build.
 */

export type AppEntry = {
  id: string;
  name: string;
  /** Extra spoken/typed names that should match this app. */
  aliases?: string[];
  /** Web URL, always available as a fallback. */
  web: string;
  /** Native deep link (tried first on touch devices). */
  scheme?: string;
  /** Builds a URL for "open X and search for Y" style commands. */
  search?: (query: string) => string;
  category: "media" | "social" | "work" | "dev" | "shopping" | "system" | "ai";
};

export const APPS: AppEntry[] = [
  { id: "youtube", name: "YouTube", web: "https://www.youtube.com", scheme: "vnd.youtube://", category: "media",
    search: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  { id: "spotify", name: "Spotify", web: "https://open.spotify.com", scheme: "spotify://", category: "media",
    search: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
  { id: "netflix", name: "Netflix", web: "https://www.netflix.com", scheme: "nflx://", category: "media",
    search: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}` },
  { id: "primevideo", name: "Prime Video", aliases: ["amazon prime", "prime"], web: "https://www.primevideo.com", category: "media" },
  { id: "whatsapp", name: "WhatsApp", web: "https://web.whatsapp.com", scheme: "whatsapp://", category: "social" },
  { id: "instagram", name: "Instagram", aliases: ["insta"], web: "https://www.instagram.com", scheme: "instagram://", category: "social" },
  { id: "facebook", name: "Facebook", aliases: ["fb"], web: "https://www.facebook.com", scheme: "fb://", category: "social" },
  { id: "x", name: "X", aliases: ["twitter"], web: "https://x.com", scheme: "twitter://", category: "social" },
  { id: "telegram", name: "Telegram", web: "https://web.telegram.org", scheme: "tg://", category: "social" },
  { id: "linkedin", name: "LinkedIn", web: "https://www.linkedin.com", scheme: "linkedin://", category: "social" },
  { id: "reddit", name: "Reddit", web: "https://www.reddit.com", scheme: "reddit://", category: "social" },
  { id: "gmail", name: "Gmail", aliases: ["mail", "email"], web: "https://mail.google.com", scheme: "googlegmail://", category: "work" },
  { id: "calendar", name: "Google Calendar", aliases: ["calendar"], web: "https://calendar.google.com", category: "work" },
  { id: "drive", name: "Google Drive", aliases: ["drive"], web: "https://drive.google.com", category: "work" },
  { id: "docs", name: "Google Docs", aliases: ["docs"], web: "https://docs.google.com", category: "work" },
  { id: "sheets", name: "Google Sheets", aliases: ["sheets", "excel online"], web: "https://sheets.google.com", category: "work" },
  { id: "maps", name: "Google Maps", aliases: ["maps"], web: "https://maps.google.com", scheme: "comgooglemaps://", category: "work",
    search: (q) => `https://www.google.com/maps/search/${encodeURIComponent(q)}` },
  { id: "notion", name: "Notion", web: "https://www.notion.so", scheme: "notion://", category: "work" },
  { id: "slack", name: "Slack", web: "https://app.slack.com", scheme: "slack://", category: "work" },
  { id: "zoom", name: "Zoom", web: "https://zoom.us", scheme: "zoomus://", category: "work" },
  { id: "meet", name: "Google Meet", aliases: ["meet"], web: "https://meet.google.com", category: "work" },
  { id: "teams", name: "Microsoft Teams", aliases: ["teams"], web: "https://teams.microsoft.com", scheme: "msteams://", category: "work" },
  { id: "github", name: "GitHub", web: "https://github.com", category: "dev",
    search: (q) => `https://github.com/search?q=${encodeURIComponent(q)}` },
  { id: "stackoverflow", name: "Stack Overflow", web: "https://stackoverflow.com", category: "dev" },
  { id: "vscode", name: "VS Code", aliases: ["visual studio code", "code editor"], web: "https://vscode.dev", scheme: "vscode://", category: "dev" },
  { id: "lovable", name: "Lovable", web: "https://lovable.dev", category: "dev" },
  { id: "chatgpt", name: "ChatGPT", aliases: ["open ai", "openai"], web: "https://chat.openai.com", category: "ai" },
  { id: "gemini", name: "Gemini", web: "https://gemini.google.com", category: "ai" },
  { id: "claude", name: "Claude", web: "https://claude.ai", category: "ai" },
  { id: "perplexity", name: "Perplexity", web: "https://www.perplexity.ai", category: "ai" },
  { id: "amazon", name: "Amazon", web: "https://www.amazon.com", category: "shopping",
    search: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { id: "flipkart", name: "Flipkart", web: "https://www.flipkart.com", category: "shopping",
    search: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
  { id: "google", name: "Google", aliases: ["search", "browser"], web: "https://www.google.com", category: "system",
    search: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: "phone", name: "Phone", aliases: ["dialer", "call"], web: "tel:", scheme: "tel:", category: "system" },
  { id: "sms", name: "Messages", aliases: ["text message", "sms"], web: "sms:", scheme: "sms:", category: "system" },
  { id: "camera", name: "Camera", web: "https://camera.google.com", category: "system" },
];

const OPEN_VERBS = /\b(open|launch|start|run|go to|take me to|show me)\b/i;

export type LaunchIntent = {
  app: AppEntry;
  query?: string;
  url: string;
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Parses commands like "open youtube", "launch spotify and play lofi". */
export function parseLaunchIntent(input: string): LaunchIntent | null {
  const raw = input.trim();
  if (!raw || !OPEN_VERBS.test(raw)) return null;

  const text = normalize(raw);
  const after = text.replace(new RegExp(`^.*?${OPEN_VERBS.source}\\s*`, "i"), "");
  if (!after) return null;

  let best: { app: AppEntry; len: number } | null = null;
  for (const app of APPS) {
    for (const name of [app.name, ...(app.aliases ?? [])]) {
      const n = normalize(name);
      if (!n) continue;
      const hit = new RegExp(`\\b${n.replace(/ /g, "\\s+")}\\b`).test(after);
      if (hit && (!best || n.length > best.len)) best = { app, len: n.length };
    }
  }
  if (!best) return null;

  const app = best.app;
  const names = [app.name, ...(app.aliases ?? [])].map(normalize);
  let rest = after;
  for (const n of names) rest = rest.replace(new RegExp(`\\b${n.replace(/ /g, "\\s+")}\\b`, "g"), " ");
  rest = rest
    .replace(/\b(and|then|please|app|the|for|in|on)\b/g, " ")
    .replace(/\b(search|play|find|look up|watch|listen to)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const query = rest.length > 1 ? rest : undefined;
  const url = query && app.search ? app.search(query) : app.web;
  return { app, query, url };
}

const isTouch = () =>
  typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

/** Opens the app: native deep link on mobile, web build everywhere else. */
export function launchApp(intent: LaunchIntent) {
  if (typeof window === "undefined") return;
  const { app, url, query } = intent;

  if (isTouch() && app.scheme && !query) {
    const started = Date.now();
    const timer = window.setTimeout(() => {
      // Still here after the handoff window → the native app isn't installed.
      if (Date.now() - started < 2500) window.open(url, "_blank", "noopener,noreferrer");
    }, 1200);
    window.location.href = app.scheme;
    window.addEventListener("pagehide", () => window.clearTimeout(timer), { once: true });
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function launchReply(intent: LaunchIntent) {
  return intent.query
    ? `Opening ${intent.app.name} — searching for “${intent.query}”, sir.`
    : `Opening ${intent.app.name}, sir.`;
}
