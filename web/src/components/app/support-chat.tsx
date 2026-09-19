"use client";

import { useActionState } from "react";

import { sendSupportMessageAction, type SupportState } from "@/app/app/support/actions";
import type { SupportThread } from "@/lib/support-types";

const INITIAL: SupportState = { error: null, sent: false, thread: null };

function when(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SupportChat({
  initialThread,
  onBack,
}: {
  initialThread: SupportThread;
  onBack?: () => void;
}) {
  const [state, action, pending] = useActionState(sendSupportMessageAction, INITIAL);
  const thread = state.thread ?? initialThread;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[color-mix(in_srgb,var(--ash)_55%,transparent)] px-5 pb-4 pt-5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="label text-teal transition-opacity duration-200 hover:opacity-70"
          >
            &larr; Back
          </button>
        ) : <p className="label text-teal">Support</p>}
        <h2 className="display mt-1 text-[1.25rem]">Chat with support</h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-graphite">
          Send a message here. Replies appear in this chat and are also emailed to you.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {thread.messages.length === 0 ? (
          <p className="rounded-xl border border-ash bg-mist/40 p-3 text-[0.875rem] leading-relaxed text-graphite">
            Tell us what happened and where you got stuck. Support will reply here.
          </p>
        ) : (
          thread.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[88%] rounded-[14px] px-3 py-2.5 text-[0.875rem] leading-relaxed ${
                message.sender === "gym"
                  ? "ml-auto bg-teal-bright text-deep"
                  : "border border-ash bg-mist/55 text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
              <p className={`mt-1 text-[0.6875rem] ${message.sender === "gym" ? "text-deep/65" : "text-stone"}`}>
                {message.sender === "gym" ? "You" : "Support"} · {when(message.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>

      <form action={action} className="border-t border-[color-mix(in_srgb,var(--ash)_55%,transparent)] px-5 py-4">
        <label htmlFor="support-chat-message" className="sr-only">
          Your message to support
        </label>
        <textarea
          id="support-chat-message"
          name="message"
          rows={3}
          required
          maxLength={4000}
          placeholder="Write a message..."
          disabled={pending}
          className="field leading-relaxed"
        />
        {state.error ? <p role="alert" className="mt-2 text-[0.8125rem] text-danger">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 w-full rounded-[12px] bg-teal-bright px-3 py-2.5 text-[0.9375rem] font-semibold text-deep transition-[filter,opacity] duration-200 hover:brightness-[1.06] disabled:opacity-55"
        >
          {pending ? "Sending..." : "Send message"}
        </button>
      </form>
    </div>
  );
}
