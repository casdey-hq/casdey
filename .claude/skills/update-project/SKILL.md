---
name: update-project
description: Update the project's own persistent documentation (CLAUDE.md primarily, plus related docs like README/HANDOFF/ROADMAP files) with durable facts, decisions, status changes, and corrections that came out of this session. Use when the user says "update project files", "update the project folder", "update-project", "sync CLAUDE.md", or asks to persist what happened this session into the repo's own docs rather than chat-only memory.
---

# Update Project

Write what actually happened this session into the project's own checked-in documentation, so the next person (human or agent) who opens the repo cold gets accurate context without needing this conversation.

This is a **repo-durability pass**, not a status report and not a handoff. The audience is anyone who opens `CLAUDE.md` next, with zero memory of this session.

## How this differs from adjacent tools

- **`session-handoff`** is chat-only, ephemeral, and addressed to a future *instance of you* resuming mid-flow — it includes dev server ports, background shell IDs, exact next steps. None of that belongs in project docs.
- **User memory** (`~/.claude/projects/<project>/memory/`) is Claude's own cross-session recall tied to this *user's* account — preferences, standing feedback, pointers. It is not part of the repo and nobody else reading the codebase ever sees it.
- **`update-project`** writes into files that live *in the repository* — `CLAUDE.md` and whatever else the project uses (README, handoff docs, roadmaps). These are read by the user, any collaborator, and every future session cold. Only durable, project-level facts belong here: decisions made, infrastructure stood up, status of tracked work items, corrected assumptions. Nothing session-scoped.

## When to invoke

Run this procedure before finishing any session that changes something real in casdey: code, a fix, a decision, status, a service, or a setting. Also run it when the user explicitly asks to update project files. Business data stored in `/admin` (costs, to-dos, goals, notes) is updated with `npm run hq` from `web/` and needs no duplicate doc edit.

## How to do it

1. **Find the project's own doc conventions first.** Read `CLAUDE.md` (or the repo's equivalent root doc) end to end, including any "Project structure" section describing what each file is for. Follow what it says rather than assuming — some projects keep everything in one file, others split business context from implementation detail across several docs. Default to `CLAUDE.md` as the primary target when nothing more specific is indicated.

2. **Extract what's durable from this session.** Review the whole conversation, not just the last few turns. Pull out:
   - Decisions made or reversed (a feature was scoped, built, then dropped; a plan changed).
   - Infrastructure or account changes (a service was connected, a domain verified, credentials set up) — the *what* and *where it now lives*, not the credential values themselves.
   - Status changes on anything the project already tracks (a roadmap item went from `todo` to `done`, a blocker got resolved).
   - Corrected facts — something the docs claimed that turned out to be wrong (a region, a config value, an assumption), discovered and fixed this session.
   - New standing constraints or conventions the user stated ("always do X", "never do Y going forward").

   Leave out anything that only matters to this conversation: exact tool calls, intermediate debugging, dev server ports, chat back-and-forth that didn't land on a decision.

3. **Edit in place, don't append a log entry.** If the target doc is written as current-state narrative (most `CLAUDE.md` files are), update the relevant bullet or section directly — rewrite the stale claim, extend the sentence with what changed, add a dated clause inline (`corrected 2026-08-15: ...`) where the history is worth keeping visible. Only use a running-log format if the doc already uses one. Match the existing tone, structure, and level of detail of the section you're touching — don't turn a terse bullet list into paragraphs, don't turn narrative prose into a table.

4. **Don't duplicate detail that belongs in a more specific doc.** If the project splits implementation detail into its own file (a handoff doc, a roadmap, a README), put the *implementation* detail there and leave `CLAUDE.md` with a short pointer plus the outcome. `CLAUDE.md` should stay skimmable.

5. **Sweep for stale claims the session disproved, not just add new ones.** If something discovered this session contradicts an existing claim anywhere in the project's docs (not only the file you're focused on), search for other mentions of the same wrong fact and fix those too. A correction that's fixed in one file and still wrong in three others is worse than not fixing it at all — grep for the specific stale value before considering this done.

6. **Use absolute dates, never relative ones.** "2026-08-15", not "today" or "this session" — these files get read long after the session ends.

7. **Keep every agent's entrypoint in sync.** casdey is worked on by more than one AI agent (Claude Code, Codex, possibly others), and Davide wants all of them equally informed. Facts go in `CLAUDE.md` only, which every agent reads. Then check the pointers: every skill in `.claude/skills/` has a matching `.agents/skills/<name>/SKILL.md` pointing at it (add, rename or remove to match); root `AGENTS.md` names every authoritative doc and every standing rule Davide stated this session; and nothing in `AGENTS.md` duplicates a business fact that could drift. Never hand-edit `web/AGENTS.md`, which `next dev` generates.

8. **Verify internal consistency before finishing.** Re-read the sections you touched end to end. A common failure mode is editing one bullet to reflect a new status while an earlier bullet in the same doc still asserts the old one — check for that specifically, not just that your own edit reads correctly in isolation.

9. **Report what you changed, in chat, after editing.** A short list of file paths and the one-line gist of what moved in each — not a re-print of the diffs. Do not silently edit without saying so.

## Hard rules

1. **Commit the doc changes, but do not push without fresh, explicit user confirmation.** `main` auto-deploys production through Vercel. A commit is not approval to deploy.
2. **Never invent or infer facts not established this session.** If something is unclear or you're not confident it happened, ask rather than writing a guess into a document other people will treat as ground truth.
3. **Never write credentials, secrets, or API keys into project docs**, even ones already in `.env` files. Reference that a credential was set and where (`RESEND_API_KEY` in `.env.local`), never the value.
4. **Don't touch files outside the project's own documentation.** This skill edits docs (`.md` files, doc comments in config), not application code, even if fixing a stale claim would technically also mean changing a code comment — flag those separately rather than folding them in silently.
5. **No changelog spam.** If a doc is narrative-style, resist the urge to turn every session into a dated log entry. Only add a dated clause when the history (what it used to say, and why it changed) is itself useful to a future reader — otherwise just state the current fact.

## Anti-patterns — do not do these

- Turning `CLAUDE.md` into a running session log ("2026-08-15: did X. 2026-08-14: did Y.") when it was written as current-state narrative.
- Copying this session's `session-handoff` output into a project doc verbatim — handoffs are for the next agent's working memory, not for the repo.
- Updating one file's claim and leaving the same stale fact elsewhere in the repo uncorrected.
- Pushing doc changes without fresh, explicit user confirmation.
- Writing implementation-level detail into `CLAUDE.md` when the project has a more specific doc for it.
- Padding out a one-line status change into a paragraph because it feels more thorough — match the existing density of the section.
