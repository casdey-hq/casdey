---
name: push-github
description: Commit and push local changes to GitHub for this repo. Use when the user says "push", "push to github", "push-github", "update github", "ship this", "commit and push", or asks to sync local changes to the remote. Handles staging, commit message conventions, and a mandatory confirmation gate before pushing to main.
---

# Push to GitHub

Get the repo's local work onto GitHub (`origin`), safely. Since 2026-09-26 (the part 1 cleanup) the repo is **not** connected to Vercel, so a push deploys nothing. The confirmation rule below still stands, because Davide set it as a standing rule and the new app will very likely be wired to auto-deploy again. When that happens, record it in `CLAUDE.md` and say plainly, before each push to `main`, that it deploys production.

## Standing rule — read this first

This project has an explicit rule (see memory: `no-push-until-complete`): **commits are fine any time, pushes to `main` need fresh explicit confirmation every time**, even if a similar push was approved earlier in the same session or a prior one. Being asked to run this skill is not itself that confirmation. "Push" as a skill trigger can be casual, or part of describing what the skill should do, rather than a deliberate "yes, ship this right now."

**Always confirm before the actual `git push` to `main`**, even when the user's invocation sounds like an instruction to push. State plainly what would go live (branch, the commit list, whether it's `main`) and wait for a clear yes. The one exception: if the user's message in this same turn is unambiguous and specific about pushing right now ("push commit X to main now", "yes, push it") then re-confirming would be redundant. Use judgment on whether the ask is truly an unambiguous immediate-run instruction, not just a mention of the skill's purpose.

If the target branch is not `main` (a feature/topic branch that doesn't auto-deploy), this rule matters less. Still worth a quick confirmation, but nowhere near as consequential, since nothing goes live from it.

## How to do it

1. **Check status first.** `git status`, `git log --oneline -5`, `git diff --stat` so you know exactly what's uncommitted, what's already committed but unpushed, and how far ahead/behind `origin/main` the branch is. Don't assume; look.

2. **Verify before shipping, if the project has verification commands.** Check `CLAUDE.md`, `package.json`, or this skill's own notes for the project's test/build/lint commands. Run whatever applies if there's uncommitted or unpushed code, don't push something unverified. Skip this step for pure doc/content changes where it doesn't apply.

3. **Stage and commit anything uncommitted that belongs in this push.** Don't blindly `git add -A` without checking what's actually there first, review `git status` output and confirm nothing unexpected (stray scratch files, unrelated WIP) is about to get swept in. Write a commit message that matches the repo's existing convention (check `git log` for style, casdey uses `<area>: <what changed>` subject lines, e.g. `docs: record the market research`, with a body when the change has several distinct parts). Always end commit messages with:
   ```
   Co-Authored-By: <the attribution line the session's system reminder gives>
   ```
   Branch first if currently on the repo's default branch and the user hasn't said to commit straight to it. In this repo the existing convention is committing directly to `main`, but confirm that's still wanted for a given change rather than assuming it always is.

4. **State the consequence, then confirm, then push.** Before running `git push`, tell the user plainly: which branch, which commits (a short named list, not just a count), and, if `main` is wired to auto-deploy again, that this deploys production. Wait for an explicit yes per the standing rule above. Then run `git push`.

5. **Report the result.** Confirm the push succeeded (new commit SHA, branch, what `origin/main` now points to), and if a deploy is wired up, say what actually changes for a real visitor.

## Hard rules

1. **Never push to `main` without a fresh, explicit yes in this turn.** See standing rule above. This is the one rule this whole skill exists to enforce; everything else is normal git hygiene.
2. **Never force-push** (`--force`, `--force-with-lease`) unless the user explicitly asks for it by name and clearly understands what it discards.
3. **Never skip hooks or bypass signing** (`--no-verify`, `--no-gpg-sign`, `-c commit.gpgsign=false`) unless explicitly asked.
4. **Don't invent a commit message that overstates what changed.** If the diff is small, say so plainly; don't pad a one-line fix into a multi-paragraph commit body.
5. **If `git push` fails** (diverged history, auth, protected branch), report the actual error rather than retrying blindly with a destructive flag.

## Anti-patterns — do not do these

- Treating "the skill was invoked" as the confirmation the standing rule requires. The skill firing and the user approving *this specific push* are two different things.
- Running `git add -A` and committing without first looking at what `git status` actually shows.
- Pushing straight to `main` out of habit when a feature branch would be more appropriate for the change, without checking.
- Skipping verification because "it's probably fine."
- Bundling unrelated uncommitted changes into one push just because they happened to be sitting in the working tree.
- Announcing a successful push without saying what it actually changes live, when a deploy is wired up.
