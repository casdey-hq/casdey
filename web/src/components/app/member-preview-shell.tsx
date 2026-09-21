"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** A quick read that leaves the filtered list in place. Editing stays on the
 * full member page, where its existing guards and forms already live. */
export function MemberPreviewShell({
  closeHref,
  title,
  children,
}: {
  closeHref: string;
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push(closeHref, { scroll: false });
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      prior?.focus();
    };
  }, [closeHref, router]);

  return (
    <div className="member-preview-layer">
      <Link href={closeHref} scroll={false} className="member-preview-scrim" aria-hidden="true" tabIndex={-1} />
      <aside ref={panel} className="member-preview-panel" role="dialog" aria-modal="true" aria-label={`${title} preview`}>
        <div className="member-preview-bar">
          <span className="label text-stone">Member preview</span>
          <Link ref={close} href={closeHref} scroll={false} className="member-preview-close" aria-label="Close member preview">×</Link>
        </div>
        {children}
      </aside>
    </div>
  );
}
