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
    <header className="flex items-end justify-between gap-4 pb-6">
      <div className="animate-rise">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("glass rounded-3xl p-5", className)}>{children}</section>;
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
        "mx-auto w-full max-w-5xl px-4 pt-10 sm:px-6",
        padBottom ? "pb-52" : "pb-32",
        className,
      )}
    >
      {children}
    </main>
  );
}
