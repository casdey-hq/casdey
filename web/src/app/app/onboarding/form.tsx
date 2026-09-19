"use client";

import { useActionState, useId, useState } from "react";

import { Button } from "@/components/app/ui";
import { COUNTRIES } from "@/lib/countries";
import { createGymAction, type OnboardingState } from "./actions";

const INITIAL: OnboardingState = { error: null };

/**
 * The browser's own timezone, when it is one of the choices offered for the
 * country. A gym owner signing up from their desk is almost always sitting in
 * the zone their gym runs on, so this is a better first guess than the
 * country's biggest city.
 */
function guessTimezone(country: string): string {
  const entry = COUNTRIES.find((c) => c.code === country);
  if (!entry?.timezones) return entry?.timezone ?? "";
  try {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (entry.timezones.some((t) => t.value === local)) return local;
  } catch {
    // Some privacy modes refuse. The country default is fine.
  }
  return entry.timezone;
}

export function OnboardingForm({
  defaultEmail,
  defaultCountry,
}: {
  defaultEmail: string;
  /** Where the visitor is, when casdey sells there. See src/lib/visitor.ts. */
  defaultCountry: string;
}) {
  const id = useId();
  const [state, action, pending] = useActionState(
    createGymAction,
    INITIAL,
  );

  const [country, setCountry] = useState(defaultCountry);
  const [timezone, setTimezone] = useState(() => guessTimezone(defaultCountry));
  const zones = COUNTRIES.find((c) => c.code === country)?.timezones;

  // The reply-to defaults to the account email but is genuinely a different
  // thing: it is where a member's "yes, book me in" lands, so it needs to be
  // an inbox somebody at the gym actually watches.
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [replyTouched, setReplyTouched] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState(defaultEmail);

  return (
    <form action={action} className="card p-7">
      <div className="mb-5">
        <label htmlFor={`${id}-name`} className="field-label">
          Gym name
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={200}
          disabled={pending}
          className="field"
          placeholder="Iron Works Gym"
        />
        <p className="field-hint">
          Members see this as the sender name on every message.
        </p>
      </div>

      <div className="mb-5">
        <label htmlFor={`${id}-country`} className="field-label">
          Country
        </label>
        <select
          id={`${id}-country`}
          name="country"
          required
          value={country}
          onChange={(event) => {
            setCountry(event.target.value);
            setTimezone(guessTimezone(event.target.value));
          }}
          disabled={pending}
          className="field"
        >
          {COUNTRIES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </select>
        <p className="field-hint">
          Sets your billing currency and the time messages go out.
        </p>
      </div>

      {zones ? (
        <div className="mb-5">
          <label htmlFor={`${id}-timezone`} className="field-label">
            Time zone
          </label>
          <select
            id={`${id}-timezone`}
            name="timezone"
            required
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            disabled={pending}
            className="field"
          >
            {zones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
          <p className="field-hint">
            The booking times your members are offered, and when messages go
            out, follow this.
          </p>
        </div>
      ) : null}

      <div className="mb-5">
        <label htmlFor={`${id}-contact`} className="field-label">
          Account email
        </label>
        <input
          id={`${id}-contact`}
          name="contactEmail"
          type="email"
          required
          maxLength={320}
          disabled={pending}
          className="field"
          value={contactEmail}
          onChange={(event) => {
            setContactEmail(event.target.value);
            if (!replyTouched) setReplyToEmail(event.target.value);
          }}
        />
        <p className="field-hint">Billing and account notices come here.</p>
      </div>

      <div className="mb-6">
        <label htmlFor={`${id}-reply`} className="field-label">
          Where member replies go
        </label>
        <input
          id={`${id}-reply`}
          name="replyToEmail"
          type="email"
          required
          maxLength={320}
          disabled={pending}
          className="field"
          value={replyToEmail}
          onChange={(event) => {
            setReplyTouched(true);
            setReplyToEmail(event.target.value);
          }}
        />
        <p className="field-hint">
          When a member replies to book, it lands in this inbox. Usually your
          reception address.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="notice notice-error mb-5">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Setting up" : "Continue"}
      </Button>
    </form>
  );
}
