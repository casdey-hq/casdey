"use client";

import { useActionState } from "react";

import { Button, Card, Notice } from "@/components/app/ui";
import {
  sendFeedbackAction,
  type FeedbackState,
} from "@/app/app/feedback-actions";

const INITIAL: FeedbackState = { error: null, sent: false };

export function SupportForm() {
  const [state, action, pending] = useActionState(sendFeedbackAction, INITIAL);

  if (state.sent) {
    return (
      <Notice>
        Davide has been notified and will reply directly to the email on your
        casdey account.
      </Notice>
    );
  }

  return (
    <Card>
      <form action={action}>
        <input type="hidden" name="kind" value="support" />
        <input type="hidden" name="path" value="/app/support" />
        <label htmlFor="support-message" className="field-label">
          What do you need help with?
        </label>
        <textarea
          id="support-message"
          name="message"
          required
          maxLength={4000}
          rows={8}
          placeholder="Tell us what happened, what you expected, and where you got stuck."
          className="field mt-2 leading-relaxed"
        />
        <p className="field-hint">
          Include the page you were on and any message you saw. Do not include
          member details unless they are essential to the issue.
        </p>
        {state.error ? (
          <p role="alert" className="notice notice-error mt-4">
            {state.error}
          </p>
        ) : null}
        <div className="mt-5">
          <Button type="submit" disabled={pending}>
            {pending ? "Sending" : "Send to Davide"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
