# Casdey

Write the name as **Casdey** (capital C) in text and copy, since 2026-09-27 (Davide: cleaner; before that it was always lowercase). The logo wordmark may still be drawn lowercase if that looks better; that is a design choice.

## What casdey is now
casdey is Davide's business: one founder, no team, no legal entity yet (see
`memory.md` §5). **Part 1**, a B2B win-back SaaS for gyms, was stopped on
2026-09-26 and archived at the git tag `casdey-pt1`. **Part 2** is a **B2C
glow-up app for men 18-28**, entering a proven market (Umax and peers) with
five differentiators: close the execution gap with AI-verified daily
check-ins, one integrated plan, total pricing trust, Apple-grade polish, and
real-world appearance instead of fake face scores. It uses a normal
subscription, and a free first analysis as the hook.

**Stage: pre-build.** Next comes a waitlist plus the first short-form videos,
to test the promise and prices before building (sell before build). Then the
new Apple-grade brand, and the choice of iOS app vs web app. Nothing is
deployed; casdey.com is down.

## Read `memory.md` when the task touches
the research and reasoning behind part 2 · marketing and budget · accounts,
services and where their keys live · part 1's history and lessons · technical
gotchas already hit (Supabase, Vercel, Stripe, webhooks, Google, email) ·
legal and tax. Don't load it for tasks that don't need it.

## Standing rules
- **Keep this file short** (Davide, 2026-09-26). New decisions, research,
  numbers and history go in `memory.md`; this file only says what casdey is
  now, the rules, and where things live.
- **Hormozi is the lens** for business calls (offer, pricing, channels, "is
  this worth it"): `.claude/skills/hormozi/`, which carries the decision
  ledger and the books.
- **Copy what already works, then make it better.** Prefer proven markets and
  proven mechanics over new inventions.
- **Sell before build.** Validate demand before building for real.
- **No em dashes** as punctuation in any casdey copy or doc. Hyphens in
  compound words are fine.
- Email sign-off: `Davide @casdey`. Money is framed in EUR first.
- **Pushing to `main` needs a fresh, explicit yes every time**, even though
  nothing is wired to deploy right now. Commits are fine anytime.
- **Never send anything external** (email, DM, post) without Davide's
  go-ahead for that specific send.
- Never write credential values into any doc.

## Project structure
- `CLAUDE.md`: this file, loaded every session.
- `memory.md`: the long-form record, read on demand.
- `AGENTS.md` and `.agents/skills/`: thin entrypoints for other AI agents
  (Codex and others), pointing back here. Keep them in sync when skills or
  rules change; never copy business facts into them.
- `.claude/skills/`: `hormozi` (with `references/books/`, gitignored),
  `frontend-design` (read before any visual work), `grill-me`,
  `push-github`, `update-project` (keeps `CLAUDE.md` and `memory.md`
  current), `session-handoff`.
- `brand assets/casdey Logo.png`: the old mark, kept for now; the brand will
  very likely be redone.
- `.env` and `.env.local` (gitignored): keys for the accounts listed in
  `memory.md` §2.
