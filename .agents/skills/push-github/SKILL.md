---
name: push-github
description: Prepare, verify, commit, and push casdey changes to GitHub when requested, with a mandatory fresh confirmation before pushing main.
---

# casdey GitHub delivery

Read `.claude/skills/push-github/SKILL.md` as the canonical delivery procedure.
The production confirmation gate is mandatory: pushing `main` deploys casdey.
Do not use Claude-specific commit attribution; use the current agent's normal
attribution. Do not push until the user gives fresh, explicit confirmation for
the exact pending `main` push.
