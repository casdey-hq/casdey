"use client";

import { useId, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";

const goals = [
  { value: "body", label: "Body" },
  { value: "face", label: "Face and skin" },
  { value: "style", label: "Style" },
  { value: "discipline", label: "Discipline" },
] as const;

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

export function WaitlistForm({ source }: { source: string }) {
  const id = useId();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState({ kind: "sending" });
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          goal: data.get("goal"),
          website: data.get("website"),
          source,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setState({ kind: "error", message: body.error ?? "That didn't go through. Try again in a moment." });
        return;
      }
      posthog.capture("waitlist_joined", { goal: data.get("goal") || null, source });
      setState({ kind: "done" });
    } catch {
      setState({ kind: "error", message: "No connection. Check your internet and try again." });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="done" role="status">
        <strong>You&rsquo;re on the list.</strong>
        <p>Check your inbox for a confirmation. We&rsquo;ll email you when your free analysis is ready.</p>
      </div>
    );
  }

  return (
    <form className="join" onSubmit={onSubmit} noValidate={false}>
      <fieldset className="goals">
        <legend className="goal-label">What do you want to improve most?</legend>
        {goals.map((goal) => (
          <label key={goal.value} className="chip">
            <input type="radio" name="goal" value={goal.value} />
            <span>{goal.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="row">
        <label htmlFor={`${id}-email`} className="hp">Email</label>
        <input id={`${id}-email`} name="email" type="email" required autoComplete="email" placeholder="Your email" />
        <button className="btn" type="submit" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? "Joining" : "Join the waitlist"}
        </button>
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Leave this empty</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {state.kind === "error" ? <p className="msg error" role="alert">{state.message}</p> : null}
      <p className="fine">
        Free face and physique analysis for everyone on the list. By joining you agree to the <Link href="/privacy">privacy notice</Link>.
      </p>
    </form>
  );
}
