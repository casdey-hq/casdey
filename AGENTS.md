# casdey agent guide

## Start of every session

This file holds rules and pointers only, never business facts. The current
state of casdey lives in one place, `CLAUDE.md`, and every agent reads it
there, so all agents work from the same knowledge. `CLAUDE.md` is long (over
100 KB) and is not loaded automatically, so before any substantive task:

1. Run `npm run hq -- summary` from `web/`. It prints everything written in
   casdey HQ (`/admin`, the one place for the business since 2026-09-19):
   the goals, open to-dos, who does what, costs, the offer, the marketing
   plan and the latest Sunday check-up. The old `casdey-hq.md` and its
   Google Doc were deleted on 2026-09-19. Live numbers are on `/admin` itself, or from
   `npm run checkup:marketing` and `npm run checkup:numbers`.
2. Read the parts of `CLAUDE.md` your task touches. For "where do things
   stand", the most current sections are "Marketing plan", "Stage 1
   progress" and the latest "Stage 2 progress" bullets. Newer information
   often sits in dated corrections inside a bullet ("Corrected 2026-09-12:
   ..."), and a correction overrides the text before it.

## Keeping every agent in sync

Davide works with more than one AI agent (Claude Code, Codex, and possibly
others later), and all of them must stay equally informed. When your work
changes the project:

- Durable business facts, decisions and status go into `CLAUDE.md` (or the
  more specific doc it names), never into this file, where they would drift.
- A new or renamed skill in `.claude/skills/` needs a matching pointer file
  in `.agents/skills/<name>/SKILL.md`.
- A new authoritative doc, a moved file, or a new standing rule from Davide
  needs a line here.
- The procedure is `.claude/skills/update-project/SKILL.md`.

## Conventions that apply to everything

- casdey has one founder, Davide. Never write copy implying a team.
- Never use em dashes as punctuation in casdey copy. Hyphens in compound
  words are fine.
- Prices and money lead in EUR; the market is Europe, not UK-first.
- Business calls (offer, pricing, outreach, lead generation) are judged
  through Alex Hormozi's frameworks, Davide's chosen mentor:
  `.claude/skills/hormozi/`.

## Scope and project sources

- `casdey` is always lowercase, including at the start of a sentence.
- The Next.js application is in `web/`. Read `web/AGENTS.md` before changing
  application code. Its Next.js guidance is generated and must not be edited
  manually.
- Read the task-relevant source before implementation:
  - setup and environment: `web/README.md`
  - product and deployment state: `web/SAAS_HANDOFF.md`
  - V1 work: `web/SAAS_V1_PLAN.md`
  - trial, signup, activation, or paid-week work: `web/SAAS_V1_1_PLAN.md`
  - the current improvements list Davide is working through, recorded
    verbatim, with a status board: `IMPROVEMENTS.md`
  - visual work: `brand assets/casdey-brand-guide.html` and
    `brand assets/CLAUDE_DESIGN.md`
  - business context, historical decisions, and infrastructure details:
    relevant sections of `CLAUDE.md`
  - work in the knowledge base: read `wiki/CLAUDE.md` first.
- `CLAUDE.md` and `.claude/` remain the canonical Claude Code setup. Do not
  rename, replace, or duplicate them. Codex-compatible workflow entrypoints
  are in `.agents/skills/` and refer to the canonical Claude skill material.

## Safety and delivery

- Treat credentials, production data, member data, and outreach-lead data as
  sensitive. Never print, commit, or copy secrets or personal data into docs.
- For application changes, run from `web/`: `npm run typecheck`,
  `npm run lint`, and the relevant `npm run test` tests.
- `main` auto-deploys production through Vercel. Never push to `main` without
  fresh, explicit user confirmation immediately before that push. A commit is
  not approval to deploy. Put work that must not deploy on a branch.
- Do not run an external send, publish, deploy, or destructive data operation
  unless the user has authorized that specific action.
