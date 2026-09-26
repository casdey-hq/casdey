# casdey agent guide

This file holds rules and pointers only, never business facts, which live in
`CLAUDE.md` (short, current state and standing rules) and `memory.md` (the
long-form record, read on demand). Every agent reads the same two files, so
all agents work from the same knowledge.

## Start of every session
1. Read `CLAUDE.md` in full. It is one page.
2. Read the sections of `memory.md` your task touches.
3. Run `git status -sb` and `git pull --rebase`: more than one agent may push
   to `origin/main`. Rebase rather than merge while nothing local is pushed.

## Keeping every agent in sync
- When Davide asks to update the project docs, follow
  `.claude/skills/update-project/SKILL.md`: current state and rules in
  `CLAUDE.md`, everything else in `memory.md`. Correct stale claims in place.
- A new or renamed skill in `.claude/skills/` needs a matching pointer file in
  `.agents/skills/<name>/SKILL.md`.
- A new authoritative doc, a moved file, or a new standing rule from Davide
  needs a line here.
- `CLAUDE.md` and `.claude/` remain the canonical setup. Do not rename,
  replace or duplicate them.

## Conventions
- Write the name as **Casdey** (capital C) in text since 2026-09-26; see `CLAUDE.md`. Casdey has one founder, Davide; never write
  copy implying a team.
- No em dashes as punctuation in Casdey copy. Hyphens in compound words are
  fine.
- Business calls are judged through Alex Hormozi's frameworks:
  `.claude/skills/hormozi/`.

## Safety
- Treat credentials and personal data as sensitive. Never print, commit or
  copy secrets or personal data into docs.
- Never push to `main` without fresh, explicit confirmation immediately
  before that push. A commit is not approval to push.
- Do not run an external send, publish, deploy or destructive data operation
  unless Davide has authorized that specific action.
