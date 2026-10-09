import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessagesSquare, TerminalSquare, ListChecks, Settings2, History } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/chats", label: "Chats", icon: MessagesSquare },
  { to: "/history", label: "History", icon: History },
  { to: "/terminal", label: "Terminal", icon: TerminalSquare },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/settings", label: "Settings", icon: Settings2 },
] as const;

/** Floating liquid-glass navigation with a morphing pill highlight. */
export function NavBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => (t.to === "/" ? pathname === "/" : pathname.startsWith(t.to))),
  );

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-auto fixed bottom-4 left-1/2 z-50 w-[min(560px,calc(100%-1.5rem))] -translate-x-1/2"
    >
      <div className="glass glass-sheen relative grid grid-cols-6 gap-1 rounded-3xl p-1.5">
        <span
          aria-hidden
          className="absolute bottom-1.5 top-1.5 rounded-[1.15rem] transition-[transform,width] duration-500"
          style={{
            width: `calc((100% - 0.75rem - 1.25rem) / 6)`,
            transform: `translateX(calc(${activeIndex} * (100% + 0.25rem)))`,
            left: "0.375rem",
            background: "color-mix(in oklab, var(--glass-highlight) 30%, transparent)",
            boxShadow:
              "inset 0 1px 0 0 var(--glass-highlight), 0 0 32px -6px color-mix(in oklab, var(--electric) 70%, transparent)",
          }}
        />
        {TABS.map(({ to, label, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "relative z-10 flex flex-col items-center gap-1 rounded-[1.15rem] px-0.5 py-2 text-[10px] min-w-0 truncate font-medium tracking-wide transition-colors duration-300",
              i === activeIndex ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] transition-transform duration-300", i === activeIndex && "scale-110")} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
