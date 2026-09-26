"use client";

import { createContext, useContext, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Switching period re-renders the page on the server (PostHog queries take a
// second or two). A transition keeps the old numbers on screen, dimmed, with a
// progress bar and a spinner on the chosen option, until the new ones arrive.
const Pending = createContext<{ pending: boolean; target: string | null; go: (value: string) => void }>({
  pending: false,
  target: null,
  go: () => undefined,
});

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const go = (value: string) => {
    setTarget(value);
    startTransition(() => router.push(`/admin?range=${value}`));
  };
  return <Pending.Provider value={{ pending, target: pending ? target : null, go }}>{children}</Pending.Provider>;
}

export function PeriodTabs({ options, current }: { options: { value: string; label: string }[]; current: string }) {
  const { go, target } = useContext(Pending);
  return (
    <nav className="ranges" aria-label="Period">
      {options.map((option) => (
        <Link
          key={option.value}
          href={`/admin?range=${option.value}`}
          prefetch={false}
          aria-current={option.value === (target ?? current) ? "page" : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || option.value === current) return;
            event.preventDefault();
            go(option.value);
          }}
        >
          {option.label}
          {option.value === target ? <span className="spinner" aria-hidden="true" /> : null}
        </Link>
      ))}
    </nav>
  );
}

export function PeriodBody({ children }: { children: React.ReactNode }) {
  const { pending } = useContext(Pending);
  return (
    <>
      <div className={pending ? "progress is-on" : "progress"} aria-hidden="true" />
      <div className={pending ? "period-body is-loading" : "period-body"} aria-busy={pending}>
        {children}
      </div>
    </>
  );
}
