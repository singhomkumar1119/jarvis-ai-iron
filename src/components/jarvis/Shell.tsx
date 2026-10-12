import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ambient cinematic backdrop shared by every screen. */
export function Ambience() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--electric) 22%, transparent), transparent 65%)",
        }}
      />
      <div
        className="absolute -bottom-52 -right-32 h-[560px] w-[560px] rounded-full blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--violet) 22%, transparent), transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, color-mix(in oklab, var(--charcoal) 90%, transparent), transparent 70%)",
        }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 pb-6 sm:flex sm:justify-between sm:gap-4">
      <div className="min-w-0 animate-rise">
        <h1 className="break-words text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 break-words text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("glass min-w-0 rounded-3xl p-4 sm:p-5", className)}>{children}</section>;
}

export function Page({
  children,
  className,
  padBottom = true,
}: {
  children: ReactNode;
  className?: string;
  padBottom?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full min-w-0 max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10",
        padBottom ? "jarvis-page" : "jarvis-page-no-composer",
        className,
      )}
    >
      {children}
    </main>
  );
}
