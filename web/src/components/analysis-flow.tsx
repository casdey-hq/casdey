"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { Mark } from "@/components/mark";
import { QUESTIONS, toMetric, type Units } from "@/lib/quiz";

type Lever = { title: string; why: string; first_step: string; gain: number };
type Step =
  | { kind: "intro" }
  | { kind: "question"; index: number }
  | { kind: "body" }
  | { kind: "photos" }
  | { kind: "email" }
  | { kind: "working" }
  | { kind: "result"; score: number; potential: number; read: string; levers: Lever[] };

// The body step sits right after age, so the order is goal, age, body, then the rest.
const BODY_AFTER = QUESTIONS.findIndex((q) => q.id === "age");
const TOTAL = QUESTIONS.length + 3; // questions, body, photos, email

function position(step: Step): number {
  if (step.kind === "question") return step.index <= BODY_AFTER ? step.index + 1 : step.index + 2;
  if (step.kind === "body") return BODY_AFTER + 2;
  if (step.kind === "photos") return TOTAL - 1;
  if (step.kind === "email") return TOTAL;
  return 0;
}

const WORKING_LINES = ["Reading your skin", "Looking at hair and grooming", "Checking posture and fit", "Weighing your answers", "Ranking your levers"];

/** Shrinks a photo to 1280 px on the long side and re-encodes it as JPEG. */
async function prepare(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AnalysisFlow() {
  const id = useId();
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [history, setHistory] = useState<Step[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Units>("metric");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [face, setFace] = useState<string | null>(null);
  const [bodyPhoto, setBodyPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workingLine, setWorkingLine] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    top.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    if (step.kind !== "working") return;
    const timer = window.setInterval(() => setWorkingLine((line) => Math.min(line + 1, WORKING_LINES.length - 1)), 3200);
    return () => window.clearInterval(timer);
  }, [step.kind]);

  function go(next: Step) {
    setError(null);
    setHistory((past) => [...past, step]);
    setStep(next);
    if (next.kind !== "working" && next.kind !== "result") posthog.capture("analysis_step", { step: position(next) });
  }

  function back() {
    setError(null);
    setHistory((past) => {
      const previous = past[past.length - 1];
      if (previous) setStep(previous);
      return past.slice(0, -1);
    });
  }

  function afterQuestion(index: number): Step {
    if (index === BODY_AFTER) return { kind: "body" };
    if (index + 1 < QUESTIONS.length) return { kind: "question", index: index + 1 };
    return { kind: "photos" };
  }

  function answer(index: number, value: string) {
    const question = QUESTIONS[index];
    setAnswers((current) => ({ ...current, [question.id]: value }));
    if (question.id === "age" && value === "under18") {
      setError("Casdey is for people 18 and over, so we can't analyse your photos. Thanks for being honest.");
      return;
    }
    go(afterQuestion(index));
  }

  function bodyNext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { cm, kg } = toMetric({ units, height: Number(height), weight: Number(weight) });
    if (!(cm >= 130 && cm <= 230 && kg >= 35 && kg <= 250)) {
      setError(units === "metric" ? "Enter your height in cm and your weight in kg." : "Enter your height in inches and your weight in pounds.");
      return;
    }
    go({ kind: "question", index: BODY_AFTER + 1 });
  }

  async function pick(event: React.ChangeEvent<HTMLInputElement>, set: (value: string | null) => void) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      set(await prepare(file));
      setError(null);
    } catch {
      setError("That photo couldn't be opened. Try a JPEG or PNG, or take a new one.");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      email: data.get("email"),
      adult: data.get("adult") === "on",
      website: data.get("website"),
      answers,
      body: { units, height: Number(height), weight: Number(weight) },
      face,
      bodyPhoto,
      source: new URLSearchParams(window.location.search).get("utm_source") ?? "site",
    };
    setWorkingLine(0);
    go({ kind: "working" });
    posthog.capture("analysis_submitted", { goal: answers.goal, body_photo: Boolean(bodyPhoto) });
    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; retake?: string; score?: number; potential?: number; read?: string; levers?: Lever[] };
      if (body.retake) {
        posthog.capture("analysis_retake");
        setFace(null);
        setStep({ kind: "photos" });
        setError(body.retake);
        return;
      }
      if (!response.ok || !body.levers || !body.read || !body.score || !body.potential) {
        posthog.capture("analysis_error", { status: response.status });
        setStep({ kind: "email" });
        setError(body.error ?? "The analysis didn't go through. Try again in a moment.");
        return;
      }
      posthog.capture("analysis_done", { goal: answers.goal, score: body.score, potential: body.potential });
      setHistory([]);
      setStep({ kind: "result", score: body.score, potential: body.potential, read: body.read, levers: body.levers });
    } catch {
      setStep({ kind: "email" });
      setError("No connection. Check your internet and try again.");
    }
  }

  const progress = position(step);
  const showBar = progress > 0;

  return (
    <div className="flow">
      <div className="flow-top">
        {history.length > 0 && step.kind !== "working" && step.kind !== "result" ? (
          <button type="button" className="flow-back" onClick={back}>Back</button>
        ) : (
          <Link href="/" className="flow-back">Casdey</Link>
        )}
        {showBar ? (
          <div className="flow-bar" role="progressbar" aria-label="Progress" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={progress}>
            <i style={{ width: `${(progress / TOTAL) * 100}%` }} />
          </div>
        ) : null}
      </div>

      <div className="flow-body" ref={top} tabIndex={-1}>
        {step.kind === "intro" ? (
          <div className="flow-step flow-intro">
            <Mark className="flow-mark" animate title="Casdey" />
            <h1>Your free glow&#8209;up analysis</h1>
            <p className="flow-sub">Answer a few questions, add a photo, and get your score, your potential, and the 3 changes that get you there. About 2 minutes.</p>
            <button
              type="button"
              className="btn flow-cta"
              onClick={() => {
                posthog.capture("analysis_started");
                go({ kind: "question", index: 0 });
              }}
            >
              Start
            </button>
            <p className="fine">The analysis is free. The full 90-day plan comes with a 7&#8209;day free trial, then €9.99 a month or €59.99 a year.</p>
          </div>
        ) : null}

        {step.kind === "question" ? (
          <div className="flow-step" key={step.index}>
            <h1>{QUESTIONS[step.index].title}</h1>
            {QUESTIONS[step.index].hint ? <p className="flow-sub">{QUESTIONS[step.index].hint}</p> : null}
            <div className="options" role="list">
              {QUESTIONS[step.index].choices.map((choice) => (
                <button
                  type="button"
                  role="listitem"
                  key={choice.value}
                  className={`option${answers[QUESTIONS[step.index].id] === choice.value ? " is-picked" : ""}`}
                  onClick={() => answer(step.index, choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step.kind === "body" ? (
          <form className="flow-step" onSubmit={bodyNext}>
            <h1>Your height and weight</h1>
            <p className="flow-sub">So the plan fits your body. Nobody else sees this.</p>
            <div className="units" role="group" aria-label="Units">
              <button type="button" aria-pressed={units === "metric"} onClick={() => setUnits("metric")}>cm, kg</button>
              <button type="button" aria-pressed={units === "imperial"} onClick={() => setUnits("imperial")}>in, lb</button>
            </div>
            <div className="measures">
              <label htmlFor={`${id}-height`}>
                <span>Height</span>
                <input id={`${id}-height`} inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value.replace(/[^\d.]/g, ""))} required />
                <em>{units === "metric" ? "cm" : "in"}</em>
              </label>
              <label htmlFor={`${id}-weight`}>
                <span>Weight</span>
                <input id={`${id}-weight`} inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))} required />
                <em>{units === "metric" ? "kg" : "lb"}</em>
              </label>
            </div>
            <button className="btn flow-cta" type="submit">Continue</button>
          </form>
        ) : null}

        {step.kind === "photos" ? (
          <div className="flow-step">
            <h1>Add your photos</h1>
            <p className="flow-sub">Daylight facing a window, phone at eye level, relaxed face, no filter. A clear photo gets an accurate score. Your photos are analysed and then deleted, never stored.</p>
            <div className="shots">
              <PhotoSlot label="Face" note="Required" value={face} onPick={(e) => pick(e, setFace)} onClear={() => setFace(null)} />
              <PhotoSlot label="Full body" note="Optional, for body and fit" value={bodyPhoto} onPick={(e) => pick(e, setBodyPhoto)} onClear={() => setBodyPhoto(null)} />
            </div>
            <button type="button" className="btn flow-cta" disabled={!face} onClick={() => go({ kind: "email" })}>Continue</button>
          </div>
        ) : null}

        {step.kind === "email" ? (
          <form className="flow-step" onSubmit={submit}>
            <h1>Where should we send it?</h1>
            <p className="flow-sub">You&rsquo;ll see your analysis on the next screen, and get a copy by email.</p>
            <label htmlFor={`${id}-email`} className="hp">Email</label>
            <input id={`${id}-email`} className="field" name="email" type="email" required autoComplete="email" placeholder="Your email" />
            <label className="check">
              <input type="checkbox" name="adult" required />
              <span>I&rsquo;m 18 or older, and I agree to my photos being analysed and then deleted, as the <Link href="/privacy" target="_blank">privacy notice</Link> describes.</span>
            </label>
            <div className="hp" aria-hidden="true">
              <label htmlFor={`${id}-website`}>Leave this empty</label>
              <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <button className="btn flow-cta" type="submit">See my analysis</button>
          </form>
        ) : null}

        {step.kind === "working" ? (
          <div className="flow-step flow-working" role="status" aria-live="polite">
            <Mark className="flow-mark is-thinking" />
            <h1>Analysing</h1>
            <p className="flow-sub" key={workingLine}>{WORKING_LINES[workingLine]}</p>
          </div>
        ) : null}

        {step.kind === "result" ? (
          <div className="flow-step flow-result">
            <p className="eyebrow">Your analysis</p>
            <div className="scorecard">
              {face ? (
                // eslint-disable-next-line @next/next/no-img-element -- the photo they just added, a local data URL
                <img className="scorecard-face" src={face} alt="" />
              ) : null}
              <div className="scores">
                <div className="score">
                  <span>Your score now</span>
                  <b>{step.score.toFixed(1)}</b>
                </div>
                <div className="score is-potential">
                  <span>Potential in 90 days</span>
                  <b>{step.potential.toFixed(1)}</b>
                </div>
              </div>
              <div className="score-track" aria-hidden="true">
                <i className="score-now" style={{ width: `${step.score * 10}%` }} />
                <i className="score-gain" style={{ left: `${step.score * 10}%`, width: `${(step.potential - step.score) * 10}%` }} />
              </div>
            </div>
            <p className="flow-sub">{step.read}</p>
            <h2 className="levers-title">Your 3 biggest levers</h2>
            <ol className="levers">
              {step.levers.map((lever, i) => (
                <li className="lever" key={lever.title} style={{ animationDelay: `${0.15 + i * 0.18}s` }}>
                  <span className="lever-n" aria-hidden="true">{i + 1}</span>
                  <h2>{lever.title}</h2>
                  <span className="lever-gain">+{lever.gain.toFixed(1)}</span>
                  <p>{lever.why}</p>
                  <div className="lever-step"><b>This week</b>{lever.first_step}</div>
                </li>
              ))}
            </ol>
            <div className="next">
              <Mark className="next-mark" />
              <h2>Your 90-day plan is next</h2>
              <p>
                These three, turned into one daily plan that takes you from {step.score.toFixed(1)} to {step.potential.toFixed(1)}, with a quick photo check-in each day so you actually do it. It opens soon,
                with a 7&#8209;day free trial. We&rsquo;ll email you the day it&rsquo;s ready.
              </p>
            </div>
            <p className="fine">A copy is on its way to your inbox. Your photos were not stored.</p>
          </div>
        ) : null}

        {error ? <p className="msg error flow-error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}

function PhotoSlot({
  label,
  note,
  value,
  onPick,
  onClear,
}: {
  label: string;
  note: string;
  value: string | null;
  onPick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const id = useId();
  return (
    <div className={`shot${value ? " has-photo" : ""}`}>
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL preview */}
          <img src={value} alt={`${label} photo`} />
          <button type="button" className="shot-clear" onClick={onClear}>Remove</button>
        </>
      ) : (
        <label htmlFor={id} className="shot-pick">
          <span className="shot-plus" aria-hidden="true">+</span>
          <b>{label}</b>
          <small>{note}</small>
        </label>
      )}
      <input id={id} className="visually-hidden" type="file" accept="image/*" onChange={onPick} />
    </div>
  );
}
