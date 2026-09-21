"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";

type Stage = "visits" | "away" | "returned";

export function ReturnStory({
  memberId,
  name,
  visitCount,
  lastVisit,
  returnedOn,
  monthsAway,
}: {
  memberId: string;
  name: string;
  visitCount: number;
  lastVisit: string | null;
  returnedOn: string;
  monthsAway: number | null;
}) {
  const [stage, setStage] = useState<Stage>("returned");
  const stages: { id: Stage; label: string; value: string; detail: string }[] = [
    {
      id: "visits",
      label: "Before",
      value: `${visitCount} ${visitCount === 1 ? "visit" : "visits"}`,
      detail: lastVisit
        ? `Last recorded visit: ${lastVisit}.`
        : "No last-visit date is recorded for this member.",
    },
    {
      id: "away",
      label: "Away",
      value: monthsAway === null ? "Visit unknown" : `${monthsAway} ${monthsAway === 1 ? "month" : "months"}`,
      detail: monthsAway === null
        ? "There is no visit date to measure time away."
        : `Time since the last recorded visit: ${monthsAway} ${monthsAway === 1 ? "month" : "months"}.`,
    },
    {
      id: "returned",
      label: "Back",
      value: returnedOn,
      detail: `${name} was recorded as returned on ${returnedOn}.`,
    },
  ];
  const selected = stages.find((item) => item.id === stage)!;

  return (
    <div className="return-story">
      <div
        className="return-story-track"
        aria-label="Member journey"
        style={{ "--journey-progress": stage === "visits" ? 0 : stage === "away" ? 0.5 : 1 } as CSSProperties}
      >
        {stages.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`return-story-step ${stage === item.id ? "is-selected" : ""} ${item.id === "returned" ? "is-returned" : ""}`}
            onClick={() => setStage(item.id)}
            aria-pressed={stage === item.id}
          >
            <span className="return-story-node" aria-hidden="true">{index + 1}</span>
            <span className="return-story-label">{item.label}</span>
            <span className="return-story-value literal">{item.value}</span>
          </button>
        ))}
      </div>
      <div className="return-story-detail" aria-live="polite" key={stage}>
        <p><span className="font-semibold text-ink">{selected.label}.</span> {selected.detail}</p>
        <Link href={`/app/members/${memberId}`} className="return-story-link">View member journey <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  );
}
