"use client";

import { useEffect, useRef, useState } from "react";

import { AppShot, type View } from "../app-shot";
import { Reveal } from "../motion";
import { Container } from "../ui";

/**
 * The one interactive block on the page: scroll through a step and the screen
 * changes with it. Clicking remains useful when somebody wants to inspect one
 * step without changing their reading position.
 *
 * This replaces a row of three numbered cards, and then a scroll-drawn
 * timeline, neither of which showed the software. A gym owner clicking
 * through four real screens learns more in ten seconds than a diagram can
 * tell them, and it is the pattern every good software site has converged
 * on for exactly that reason.
 */

const STEPS: { view: View; title: string; body: string }[] = [
  {
    view: "members",
    title: "You import your list",
    body: "A file from your gym software, or a CSV. casdey sorts it by time since the last visit and separates the members who drifted off from the ones still turning up. This is the only step that needs you.",
  },
  {
    view: "offer",
    title: "It works out what they are worth",
    body: "Enter your own membership and class prices once. casdey values the quiet half of your list against them, so you know the number before a single message goes out.",
  },
  {
    view: "campaign",
    title: "It writes to each one, as you",
    body: "Not one message to a mailing list. Each member gets their own: their name, how long they have been away, why they left if you recorded it, and the offer you chose. It leaves from your gym's address, and you approve the first send.",
  },
  {
    view: "sequence",
    title: "It follows up, then it lets go",
    body: "Most people who come back do it on the second message, not the first. casdey nudges once, then writes a last one that says it is the last, and stops. The moment somebody books, the rest of their sequence is cancelled.",
  },
  {
    view: "booking",
    title: "It books them in",
    body: "The reply is answered in your gym's name, a free slot is found in your own calendar, and the session is put in it. Nobody at the gym has to open anything for this to happen.",
  },
];

function ProcessIntro() {
  return (
    <>
      <h2 className="display max-w-[24ch] text-[clamp(1.6rem,2.6vw,2.15rem)] text-ink text-balance">
        You import your list. casdey does the rest.
      </h2>
      <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-graphite text-pretty">
        Not a dashboard telling you who to chase. It writes to every one of
        them itself, follows up when they go quiet, answers the replies in
        your name, and books them in.
      </p>
    </>
  );
}

function ScrollCue() {
  return (
    <div className="scroll-cue flex flex-col items-center gap-1.5 text-stone">
      <span className="label">Scroll down</span>
      <span aria-hidden="true" className="flex flex-col -space-y-2 text-teal">
        <svg viewBox="0 0 24 16" className="scroll-cue-chevron h-4 w-8 fill-none stroke-current" strokeWidth="1.15">
          <path d="m2 2 10 11 10-11" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg viewBox="0 0 24 16" className="scroll-cue-chevron h-4 w-8 fill-none stroke-current" strokeWidth="1.15">
          <path d="m2 2 10 11 10-11" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

export function WhatItDoes() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const mobileStageRef = useRef<HTMLDivElement>(null);
  const desktopStageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const desktop = window.innerWidth >= 1024;
      const stage = desktop ? desktopStageRef.current : mobileStageRef.current;
      if (!stage) return;

      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const stickyTop = rootFontSize * (desktop ? 11 : 8);
      const range = Math.max(stage.offsetHeight - window.innerHeight, 1);
      const nextProgress = Math.min(0.9999, Math.max(0, (stickyTop - stage.getBoundingClientRect().top) / range));
      const next = Math.floor(nextProgress * STEPS.length);
      setProgress(nextProgress);
      setActive((current) => (current === next ? current : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="what-it-does" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="lg:hidden">
          <Reveal>
            <ProcessIntro />
          </Reveal>

          <div ref={mobileStageRef} className="relative mt-10 min-h-[280vh]">
            <div className="sticky top-32">
              <div className="relative pl-5">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-ash" />
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 w-px bg-teal transition-[height] duration-200 ease-out"
                  style={{ height: `${progress * 100}%` }}
                />
                <article key={active} className="view-fade">
                  <p className="label text-teal">{String(active + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}</p>
                  <h3 className="mt-2 text-[1.0625rem] font-medium text-ink">{STEPS[active].title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-graphite">{STEPS[active].body}</p>
                </article>
                <div key={STEPS[active].view} className="view-fade mt-6">
                  <AppShot view={STEPS[active].view} />
                </div>
                {progress < 0.995 ? <div className="mt-6"><ScrollCue /></div> : null}
              </div>
            </div>
          </div>
        </div>

        <div ref={desktopStageRef} className="relative hidden min-h-[360vh] lg:block">
          <div className="sticky top-44">
            <Reveal>
              <ProcessIntro />
            </Reveal>

            <div className="mt-8 grid grid-cols-[minmax(0,20rem)_minmax(0,1fr)] gap-14">
            <div className="relative h-[405px] overflow-hidden pl-5">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-ash" />
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 w-px bg-teal"
                style={{ height: `${progress * 100}%` }}
              />
              <div
                className="will-change-transform transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
                style={{ transform: `translateY(-${active * (100 / STEPS.length)}%)` }}
              >
                {STEPS.map((step, i) => (
                  <article key={step.view} className="h-[405px] pt-8">
                    <p className="label text-teal">{String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}</p>
                    <h3 className="mt-3 text-[1.0625rem] font-medium text-ink">{step.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-graphite">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div key={active} className="view-fade">
              <AppShot view={STEPS[active].view} />
            </div>
            </div>

            {progress < 0.995 ? (
              <div className="mt-7"><ScrollCue /></div>
            ) : null}
          </div>

        </div>
      </Container>
    </section>
  );
}
