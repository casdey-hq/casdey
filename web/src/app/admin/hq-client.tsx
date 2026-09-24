"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/app/ui";
import {
  addTodo,
  closeSignal,
  saveNote,
  setTodoStatus,
  updateTodo,
  type HqActionState,
} from "./actions";

/**
 * The interactive parts of casdey HQ: ticking to-dos off, accepting the
 * check-up's proposals, adding a to-do, and editing a note. Everything else on
 * the page is rendered on the server.
 */

export type TodoItem = {
  /** A to-do's id, or a live signal's key. */
  ref: string;
  kind: "todo" | "signal";
  title: string;
  detail: string | null;
  link: string | null;
  /** Where it came from, shown small: "Live", "Check-up", "Claude", "You". */
  origin: string;
  /** When it first appeared, already formatted ("19 Sept"). */
  added: string | null;
  /** When it needs doing by, already formatted; null when it has no date. */
  due: string | null;
  /** The same due date as a plain yyyy-mm-dd, for the edit form's date input. */
  dueRaw: string | null;
  proposed: boolean;
};

export function TodoList({ items, empty }: { items: TodoItem[]; empty: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Hidden optimistically, so a tick feels instant; the server revalidates.
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);

  function act(item: TodoItem, status: "open" | "done" | "dismissed") {
    setError(null);
    setGone((current) => new Set(current).add(item.ref));
    start(async () => {
      const result =
        item.kind === "signal"
          ? await closeSignal(item.ref, item.title, status)
          : await setTodoStatus(item.ref, status);
      if (result.error) {
        setError(result.error);
        setGone((current) => {
          const next = new Set(current);
          next.delete(item.ref);
          return next;
        });
      }
    });
  }

  const visible = items.filter((item) => !gone.has(item.ref));

  return (
    <div>
      {error ? (
        <p role="alert" className="notice notice-error mb-3">
          {error}
        </p>
      ) : null}
      {visible.length === 0 ? (
        <p className="text-[0.875rem] text-stone">{empty}</p>
      ) : (
        <ul className="divide-y divide-ash overflow-hidden rounded-[14px] border border-ash bg-white">
          {visible.map((item) => (
            <li key={item.ref} className="flex items-start gap-3 px-4 py-3.5">
              {item.proposed || editing === item.ref ? null : (
                <button
                  type="button"
                  onClick={() => act(item, "done")}
                  disabled={pending}
                  aria-label={`Mark "${item.title}" done`}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-[5px] border border-stone transition-colors duration-150 hover:border-teal hover:bg-shallow disabled:opacity-50"
                />
              )}
              {editing === item.ref ? (
                <TodoEditForm
                  item={item}
                  onDone={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9375rem] font-medium text-ink">
                      {item.link ? (
                        <a
                          href={item.link}
                          target={item.link.startsWith("/") ? undefined : "_blank"}
                          rel="noopener noreferrer"
                          className="hover:text-teal"
                        >
                          {item.title}
                        </a>
                      ) : (
                        item.title
                      )}
                    </p>
                    {item.detail ? (
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-stone">
                        {item.detail}
                      </p>
                    ) : null}
                    <p className="label mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-stone">
                      <span>{item.origin}</span>
                      {item.added ? <span>Added {item.added}</span> : null}
                      <span className={item.due ? "text-ink" : undefined}>
                        {item.due ? `Due ${item.due}` : "No due date"}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {item.proposed ? (
                      <button
                        type="button"
                        onClick={() => act(item, "open")}
                        disabled={pending}
                        className="rounded-md border border-teal px-2.5 py-1 text-[0.8125rem] font-medium text-teal hover:bg-shallow disabled:opacity-50"
                      >
                        Accept
                      </button>
                    ) : null}
                    {item.kind === "todo" ? (
                      <button
                        type="button"
                        onClick={() => setEditing(item.ref)}
                        disabled={pending}
                        className="rounded-md px-2 py-1 text-[0.8125rem] text-stone hover:text-ink disabled:opacity-50"
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => act(item, "dismissed")}
                      disabled={pending}
                      className="rounded-md px-2 py-1 text-[0.8125rem] text-stone hover:text-ink disabled:opacity-50"
                    >
                      {item.proposed ? "Dismiss" : "Not needed"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const NONE: HqActionState = { error: null };

/** The inline edit form a to-do's own "Edit" button swaps its row for. */
function TodoEditForm({
  item,
  onDone,
  onCancel,
}: {
  item: TodoItem;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (previous: HqActionState, form: FormData) => {
      const result = await updateTodo(previous, form);
      if (!result.error) onDone();
      return result;
    },
    NONE,
  );

  return (
    <form action={action} className="min-w-0 flex-1 space-y-2.5">
      <input type="hidden" name="id" value={item.ref} />
      <input
        name="title"
        required
        maxLength={300}
        defaultValue={item.title}
        className="field text-[0.9375rem]"
      />
      <textarea
        name="detail"
        rows={2}
        maxLength={2000}
        defaultValue={item.detail ?? ""}
        placeholder="Details (optional)"
        className="field text-[0.8125rem]"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[0.8125rem] text-stone">
          Due
          <input
            name="due"
            type="date"
            defaultValue={item.dueRaw ?? ""}
            className="field w-auto py-1.5"
          />
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-3 text-[0.875rem] text-stone hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving" : "Save"}
          </Button>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * A to-do just marked done or dismissed, with one way back: Undo, for a
 * misclick. Shown for a short window after closing (see today-tab.tsx), not
 * forever, so this never turns into a second to-do list.
 */
export function RecentlyClosedList({
  items,
}: {
  items: { id: string; title: string; status: "done" | "dismissed" }[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [undone, setUndone] = useState<Set<string>>(new Set());

  function undo(id: string) {
    setError(null);
    setUndone((current) => new Set(current).add(id));
    start(async () => {
      const result = await setTodoStatus(id, "open");
      if (result.error) {
        setError(result.error);
        setUndone((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    });
  }

  const visible = items.filter((item) => !undone.has(item.id));
  if (visible.length === 0) return null;

  return (
    <div>
      {error ? (
        <p role="alert" className="notice notice-error mb-3">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1.5 text-[0.875rem] text-stone">
        {visible.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <span>
              <span className={item.status === "done" ? "text-teal" : "text-stone"}>
                {item.status === "done" ? "✓" : "✕"}
              </span>{" "}
              {item.title}
            </span>
            <button
              type="button"
              onClick={() => undo(item.id)}
              disabled={pending}
              className="shrink-0 text-[0.8125rem] font-medium text-teal hover:text-teal-hover disabled:opacity-50"
            >
              Undo
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AddTodoForm() {
  const [state, action, pending] = useActionState(addTodo, NONE);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-[0.875rem] font-semibold text-teal hover:text-teal-hover"
      >
        + Add a to-do
      </button>
    );
  }

  return (
    <form action={action} className="card mt-3 space-y-3 p-4">
      <input name="title" required maxLength={300} placeholder="What needs doing" className="field" />
      <textarea name="detail" rows={2} maxLength={2000} placeholder="Details (optional)" className="field" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[0.8125rem] text-stone">
          Due
          <input name="due" type="date" className="field w-auto py-1.5" />
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3 text-[0.875rem] text-stone hover:text-ink"
          >
            Cancel
          </button>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding" : "Add"}
          </Button>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * A note shown as rendered text, with an Edit button that swaps it for a plain
 * editor. The rendered view is passed in from the server, so this component
 * never has to render Markdown itself.
 */
export function NoteEditor({
  noteKey,
  body,
  children,
}: {
  noteKey: string;
  body: string;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: HqActionState, form: FormData) => {
      const result = await saveNote(previous, form);
      if (!result.error) setEditing(false);
      return result;
    },
    NONE,
  );

  if (!editing) {
    return (
      <div>
        {children}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 text-[0.8125rem] font-semibold text-teal hover:text-teal-hover"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="key" value={noteKey} />
      <textarea
        name="body"
        defaultValue={body}
        rows={Math.min(30, Math.max(8, body.split("\n").length + 2))}
        className="field literal text-[0.8125rem]"
      />
      <p className="field-hint">
        ## for a heading, - for a list, **bold**. Saved notes show at once, for
        Claude too.
      </p>
      {state.error ? (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-3 text-[0.875rem] text-stone hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
