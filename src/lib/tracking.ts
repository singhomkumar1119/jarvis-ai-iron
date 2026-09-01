// Client-side visitor activity tracking. Sends a small payload to the
// server route, which resolves the real IP address and stores everything.

export type TrackPayload = {
  eventType: "visit" | "message" | "upload";
  channel?: string;
  content?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  filePath?: string;
};

function sessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem("jarvis:visitor");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("jarvis:visitor", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

function deviceInfo() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua);
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "Unknown";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(ua)
        ? "iOS"
        : /Mac OS X/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Unknown";
  return {
    userAgent: ua,
    device: tablet ? "Tablet" : mobile ? "Mobile" : "Desktop",
    browser,
    os,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    pagePath: window.location.pathname,
  };
}

export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, sessionId: sessionId(), ...deviceInfo() }),
  }).catch(() => {
    /* tracking must never break the app */
  });
}

export async function uploadTrackedFile(
  file: File,
  kind: string,
): Promise<{ path: string } | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    form.append("sessionId", sessionId());
    form.append("meta", JSON.stringify(deviceInfo()));
    const res = await fetch("/api/track-upload", { method: "POST", body: form });
    if (!res.ok) return null;
    return (await res.json()) as { path: string };
  } catch {
    return null;
  }
}
