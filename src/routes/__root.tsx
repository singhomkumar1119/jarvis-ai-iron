import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { JarvisProvider, useJarvis } from "@/lib/jarvis-store";
import { BootScreen } from "@/components/jarvis/BootScreen";
import { NavBar } from "@/components/jarvis/NavBar";
import { Ambience } from "@/components/jarvis/Shell";
import { Toaster } from "@/components/ui/sonner";
import { track } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    const msg = String((error as Error | undefined)?.message ?? "");
    if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)) {
      try {
        const k = "jarvis-chunk-reload";
        const t = Number(sessionStorage.getItem(k) || 0);
        if (Date.now() - t > 10000) {
          sessionStorage.setItem(k, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {
        /* ignore */
      }
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "aDoOLhBy75KSkp51ZPvHD7r2vZHPyn7rXLqkRcyTvRY" },
      { title: "Jarvis — Cinematic AI assistant" },
      {
        name: "description",
        content:
          "Jarvis is a premium, cinematic AI assistant with a liquid-glass interface, voice-reactive orb and terminal mode.",
      },
      { name: "theme-color", content: "#0a0b0f" },
      { property: "og:title", content: "Jarvis — Cinematic AI assistant" },
      {
        property: "og:description",
        content: "A calm, futuristic AI workspace with a voice-reactive orb and liquid-glass controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [
      {
        children: `(function(){function r(){try{var k='jarvis-chunk-reload';var t=+sessionStorage.getItem(k)||0;if(Date.now()-t<10000)return;sessionStorage.setItem(k,String(Date.now()));}catch(e){}location.reload();}window.addEventListener('vite:preloadError',function(e){e.preventDefault();r();});window.addEventListener('unhandledrejection',function(e){var m=String((e.reason&&e.reason.message)||e.reason||'');if(/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(m)){e.preventDefault();r();}});})();`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function JarvisShell() {
  const { booted, setBooted, settings } = useJarvis();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  const isAuthPage = pathname === "/auth" || pathname === "/owner";

  useEffect(() => {
    track({ eventType: "visit" });
  }, []);

  useEffect(() => {
    const syncProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const metadata = user.user_metadata as Record<string, unknown>;
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        display_name: typeof metadata["full_name"] === "string" ? metadata["full_name"] : null,
        avatar_url: typeof metadata["avatar_url"] === "string" ? metadata["avatar_url"] : null,
        updated_at: new Date().toISOString(),
      });
    };
    void syncProfile();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (session) void syncProfile();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);



  return (
    <>
      <Ambience />
      {!isAuthPage && !booted && (
        <BootScreen onDone={() => setBooted(true)} reduceMotion={settings.reduceMotion} />
      )}
      <div className="min-h-screen">
        <Outlet />
      </div>
      {!isAuthPage && <NavBar />}
      <Toaster position="top-center" />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <JarvisProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <JarvisShell />
      </JarvisProvider>
    </QueryClientProvider>
  );
}

