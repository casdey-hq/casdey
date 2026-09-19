"use client";

import { useActionState } from "react";

import { sendAdminSupportReplyAction, type SupportState } from "@/app/app/support/actions";
import type { SupportInboxConversation } from "@/lib/support-types";

const INITIAL: SupportState = { error: null, sent: false, thread: null };

function when(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SupportReplyForm({ conversation }: { conversation: SupportInboxConversation }) {
  const [state, action, pending] = useActionState(sendAdminSupportReplyAction, INITIAL);
  const thread = state.thread ?? conversation;

  return (
    <div className="mt-4 border-t border-ash pt-4">
      <div className="space-y-2">
        {thread.messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[48rem] rounded-lg px-3 py-2 text-[0.875rem] leading-relaxed ${
              message.sender === "gym" ? "bg-mist text-ink" : "ml-auto bg-shallow text-ink"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.body}</p>
            <p className="mt-1 text-[0.6875rem] text-stone">
              {message.sender === "gym" ? "Gym" : "You"} · {when(message.createdAt)}
            </p>
          </div>
        ))}
      </div>
      <form action={action} className="mt-4">
        <input type="hidden" name="conversationId" value={conversation.conversationId ?? ""} />
        <label htmlFor={`support-reply-${conversation.conversationId}`} className="field-label">
          Reply in the chat
        </label>
        <textarea
          id={`support-reply-${conversation.conversationId}`}
          name="message"
          rows={3}
          required
          maxLength={4000}
          disabled={pending}
          placeholder="Write a reply..."
          className="field mt-1 leading-relaxed"
        />
        {state.error ? <p role="alert" className="mt-2 text-[0.8125rem] text-danger">{state.error}</p> : null}
        {state.sent ? <p role="status" className="mt-2 text-[0.8125rem] text-teal">Reply sent and the gym has been emailed.</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 rounded-[10px] bg-teal-bright px-4 py-2 text-[0.875rem] font-semibold text-deep transition-[filter,opacity] duration-200 hover:brightness-[1.06] disabled:opacity-55"
        >
          {pending ? "Sending..." : "Send reply"}
        </button>
      </form>
    </div>
  );
}
