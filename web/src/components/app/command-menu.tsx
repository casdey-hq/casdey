"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { IconFind, IconMessage } from "@/components/marks/icons";
import { APP_LINKS } from "./nav";

const ITEMS = [
  ...APP_LINKS,
  { href: "/app/campaigns/new", label: "New campaign", Icon: IconMessage },
];

/** A fast route switcher that uses the same links as the sidebar. */
export function CommandMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const search = query.trim();
  const matches = [
    ...ITEMS.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase()),
    ),
    ...(search.length >= 2
      ? [{ href: `/app/members?filter=all&q=${encodeURIComponent(search)}`, label: `Find member: “${search}”`, Icon: IconFind }]
      : []),
  ];

  function toggle() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialog.open) {
      dialog.close();
    } else {
      setQuery("");
      setActive(0);
      dialog.showModal();
      inputRef.current?.focus();
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (!dialog?.open && document.querySelector('[aria-modal="true"]')) return;
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      dialog?.close();
    };
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        className="command-trigger hidden w-full items-center gap-2.5 px-3 py-2 text-left text-[0.8125rem] text-stone md:flex"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-4 w-4">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" strokeLinecap="round" />
        </svg>
        <span className="flex-1">Jump to a page</span>
        <kbd className="text-[0.6875rem]">Ctrl K</kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="command-dialog"
        onClose={() => {
          setQuery("");
          setActive(0);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <h2 id={titleId} className="sr-only">Jump to a page</h2>
        <div className="command-search flex items-center gap-3 border-b border-ash px-5">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-5 w-5 shrink-0 text-stone">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && matches.length > 0) {
                event.preventDefault();
                setActive((index) => (index + 1) % matches.length);
              } else if (event.key === "ArrowUp" && matches.length > 0) {
                event.preventDefault();
                setActive((index) => (index - 1 + matches.length) % matches.length);
              } else if (event.key === "Enter" && matches.length > 0) {
                event.preventDefault();
                dialogRef.current?.querySelectorAll<HTMLAnchorElement>("[data-command-item]")[active]?.click();
              }
            }}
            placeholder="Go to a page or find a member"
            aria-label="Search pages and members"
            className="w-full border-0 bg-transparent py-4 text-[0.9375rem] text-ink outline-none placeholder:text-stone"
          />
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close quick navigation" className="rounded-md px-2 py-1 text-[0.75rem] text-stone hover:bg-mist hover:text-ink">Esc</button>
        </div>
        <div className="max-h-[min(60vh,25rem)] overflow-y-auto p-2">
          {matches.length === 0 ? (
            <p className="px-3 py-8 text-center text-[0.875rem] text-stone">No matching page. Type a name to search members.</p>
          ) : (
            matches.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                data-command-item
                onMouseEnter={() => setActive(index)}
                onClick={() => dialogRef.current?.close()}
                className={`command-item flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[0.875rem] text-graphite ${active === index ? "command-item-active" : ""}`}
              >
                <item.Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span aria-hidden="true" className="text-stone">↵</span>
              </Link>
            ))
          )}
        </div>
        <p className="border-t border-ash px-5 py-2.5 text-[0.75rem] text-stone">↑ ↓ to move · Enter to open · Esc to close</p>
      </dialog>
    </>
  );
}
