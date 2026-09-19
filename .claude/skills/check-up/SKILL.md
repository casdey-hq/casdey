---
name: check-up
description: >-
  Pulls a live, single-pass snapshot of how casdey is actually doing right
  now — marketing/outreach performance including the weekly outreach A/B test
  review (the Sunday marketing analysis), product and revenue numbers, what
  shipped in the codebase lately plus what's still open, and the business
  view kept in /admin (goals, to-dos, the plan) — then closes with a verdict: what's overdue, what's off target, and 1-3
  concrete actions for the week ahead. Invoke on "/check-up", or when Davide
  asks how the business is going, wants a status check, a pulse check, a
  health check, the weekly review, the weekly test review, or "where do things
  stand". Also runs automatically every Sunday via a scheduled routine (see
  "The weekly routine" below) — when invoked that way there is no chat to
  reply into, so deliver by email instead of narrating.
---

# casdey check-up

**Since 2026-09-19 the check-up writes into `/admin`, not into a report
(IMPROVEMENTS.md #2 and #4, Davide's call).** `/admin` is casdey HQ: the one
place for how the business is doing, live. Its numbers are computed on every
load, and everything written (goals, to-dos, the marketing plan, the offer,
cost lines, and this check-up's weekly analysis) lives in casdey's own tables
(migration `0041`), written with `npm run hq` from `web/`. So the check-up
no longer publishes an artifact, and the casdey HQ and Marketing Plan Google
Docs are retired. What it still does is the thinking: read the sources, judge
them against the goals, and propose next week's actions. See "Composing the
output" for where each part now goes. `npm run hq -- summary` prints
everything written in `/admin` in one read; start there.

One pass across every part of the business, read live from the actual
sources, not from memory or from `CLAUDE.md` (which is a decision record, not
a live dashboard, and goes stale between sessions). Built 2026-09-11 at
Davide's request, cadence "on-demand + every Sunday". Output: a chat summary
on demand, and every run writes into `/admin` (see the note at the top).

**One place for the whole week (Davide, 2026-09-13).** The Sunday outreach
A/B test review used to be its own manual chat session, separate from this
check-up. It now lives inside it (section 1b below). Since 2026-09-19 the
live half of it is also on `/admin`'s Marketing tab, computed by the same
rules (`src/lib/marketing-summary.ts`, ported from
`check-up-marketing.mjs`; the two must stay in step). The review's own
mechanics did not change, see 1b.

**Audience: Davide and Claude both, not Davide alone (Davide, 2026-09-13).**
This isn't a report to skim and file away — it's the shared, current picture
of the business that any casdey session (interactive or a cloud routine)
should treat as live context for deciding what to work on next, the same way
`CLAUDE.md` is treated as the decision record. When a session opens and
Davide wants to continue casdey work without saying exactly what,
`npm run hq -- summary` (the latest check-up and the open to-dos) is
the way to ground that. Write section 5
accordingly: concrete and specific enough (file paths, track names, tab
names) that a fresh Claude session with no other context could pick one of
its actions up and start, not just a headline a human would nod at.

## The sections, and where each number comes from

1. **Marketing** — the `Casdey-Gym-Leads` sheet (id
   `1WOAIA1gvK6S1kWe_Vf4-d4XmjhnDLQZLtyU_ezvOu3w`, see `CLAUDE.md` "Stage 1
   progress"), read live via `web/scripts/check-up-marketing.mjs`
   (`npm run checkup:marketing` from `web/`). Same service-account JWT
   pattern the outreach routines already write with
   (`casdey-routine@casdey-gws-cli.iam.gserviceaccount.com`), read-only scope
   (`spreadsheets.readonly`), so this can never touch a live send. Covers:
   - `leads` — status breakdown off the `Leads` tab, contacted count, and
     **two rates that must never be merged (Davide, 2026-09-13)**:
     - **Reply rate** (`genuineReplyRatePct`): gyms whose `Reply?` column
       reads "Replied", over gyms contacted. Most replies are a no thanks.
       Opt-outs ("Unsubscribed") are `optOuts`, not replies. The 3% target
       set 2026-09-02 was set on this number. (The column holds words, not
       Y/N; the script counted "Y" until 2026-09-13 and read 0 replies.)
     - **Engaged leads** (`engagedRatePct`, `engagedLeads`): gyms actually
       interested in casdey, the way JD at BodyActive is — a `Status` of
       Interested or Committed. Over gyms contacted. This is the number
       Davide cares about most; show it next to the reply rate, never
       instead of it. `/admin`'s Outreach section shows the same two, from
       `web/src/lib/outreach-summary.ts`; keep the definitions in step.
     Older check-ups and the outreach routine's own daily report called
     replies "engaged"; that wording is retired here.
   - `sendLog` — rows off the `Send Log` tab, bucketed by the `Variant`
     column into first-touch (A/B) vs follow-up-1 vs follow-up-2 sends (each
     actual send is its own row; the `Follow-up Sent (Y/N)` columns are a
     per-lead summary flag, not a send count — count rows, not flags), plus
     the CTA variant (A/B) and subject-line variant (S1/S2) splits, plus a
     `sentThisWeek` cut. Sends before the Variant column existed (pre
     2026-09-02) land in `rowTypeCounts.other`, not a bug.
   - `igOutreach` — the `IG Outreach` tab (cold DMs, sent by hand): sends,
     this-week sends, replies, follow-ups sent, unsent drafts in the queue.
   - **Instagram content, added 2026-09-13 (Davide: both the DMs and the
     posting belong in the check-up).** The plan is `content-plan.md` at the
     repo root: one post a day for 100 days from 2026-09-16. Three tabs, all
     filled by hand because Claude has no Instagram access:
     - `igContent` — the `IG Content` tab: posts drafted by Claude
       (`npm run ig:render` / `npm run ig:sync`), what Davide marked posted,
       `behindBy` against one a day since 2026-09-16, drafts awaiting his
       review, and feedback he left that still needs acting on.
     - `inboundDms` — the `Inbound DMs` tab: every gym that asks for the video
       on Instagram, from a post or a cold DM. Interested or Committed is an
       **engaged lead**, same definition as the email side; report them next
       to the email engaged leads, by source, and count both toward the ~7 a
       week. Flag any whose video has not been sent yet: a yes goes cold fast.
     - `igWeekly` — the `IG Weekly` tab: followers, accounts reached and
       accounts engaged, one row a week, written automatically by the
       Instagram publisher (`/api/cron/instagram`) on Saturday so this Sunday
       02:00 UTC run sees it. Growth is month on month in Hormozi's benchmarks
       (*$100M Leads* pg 145), so read week on week as noise and say so.
       `missingThisWeek` means the row wasn't filled; mention it, once.
   - `testLog` — every `Test Log` row, and for each **running** test a
     `liveReview`, which is what section 1b is built from.

   **1b. The weekly test review (the Sunday marketing analysis).** This is
   the "Better" half of the marketing plan (`CLAUDE.md` "Marketing plan",
   Hormozi's *$100M Leads* More/Better/New): one improvement test at a time
   on one outreach asset, reviewed every week, with a cumulative log so each
   test starts from the current best rather than square one. **The merge into
   the check-up must not change how the loop works.** It still goes:
   1. **Numbers.** `liveReview` gives, per arm, sends since the test's start
      date, replies and engaged leads. A reply is credited to the arm of the
      lead's first touch even if it arrived after a follow-up, because the
      first touch is what the test varied. The arm column is `Subject
      Variant` for a subject-line test, `Variant` otherwise.
   2. **A proposed verdict, not a decision.** `verdict` is "too few replies
      to call" under 10 replies across all arms, a winner only at p < 0.05
      (two-proportion z-test), otherwise "leads but not significantly" or
      "dead heat". Present it honestly: at casdey's reply rates a week rarely
      separates two arms, and saying so is part of the analysis. Also weigh
      engaged leads per arm, which matter more than raw replies, and name
      the Hormozi framing when it helps.
   3. **Davide decides, in chat.** The winner (or "no winner, keep running",
      or "call it for A anyway and move on") is his call. The unattended
      weekly routine only prepares the review and never decides.
   4. **The log gets written, after that decision and only then.** In the
      interactive session, once Davide has said what he wants, write the
      outcome with `npm run testlog:update -- <Test ID> <json or path>`
      (`web/scripts/test-log-update.mjs`, keys are the tab's headers;
      `liveReview.proposedTestLogUpdate` already carries Week ended, Sends,
      Replies and Reply-rate), plus `Winner`, `Decision / next step`,
      `Weeks champion unbeaten` and `Status`. A new test is
      `npm run testlog:update -- --new <json>`. Show Davide the row before
      writing it.
   5. **The 4-week rule.** A champion that survives 4 consecutive weekly
      tests is an established winner: stop testing that asset and move to
      the next one (first-touch email, follow-up emails, DM first touch, DM
      follow-up).
   6. **Setting up the next test** means changing the live outreach routine
      (`trig_018wp58QLBbeuBPbMA6Fy1sU` via `RemoteTrigger`, and
      `.claude/skills/gym-outreach/SKILL.md` on branch
      `gym-outreach-automation`). That is a separate, explicit step with
      Davide's go-ahead, never a side effect of the review.

2. **Numbers** (product + revenue + traffic) — `web/scripts/check-up-numbers.mjs`
   (`npm run checkup:numbers`). Three sources in one script:
   - **Supabase**, over the REST API (`@supabase/supabase-js`,
     `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — same as `supabaseAdmin()`
     in `src/lib/supabase.ts`), **not** a direct `pg` connection: gyms (real
     vs `is_internal`, paying, trialing, new this week, tier split), product
     usage (members, returned, approved campaigns, messages sent, bookings,
     revenue recovered), and the waitlist count. Always filter `is_internal`
     out of anything presented as a real business number — see
     `admin-stats.ts` for why that flag exists (2026-09-08, `0035`/`0036`:
     `/admin` was once counting internal test gyms as paying customers).
     **Why REST and not `pg`:** the first version connected straight to the
     Postgres pooler (`SUPABASE_DB_URL`) and worked locally, but the weekly
     routine's cloud sandbox timed out on that raw TCP connection every
     time (found 2026-09-12) — its network proxy only carries HTTPS-shaped
     traffic, which is also why Stripe and PostHog (both plain HTTPS APIs)
     worked from the same sandbox without issue. Switching to Supabase's own
     REST API fixed it outright, no sandbox networking change needed.
   - **Stripe** (live key, `STRIPE_SECRET_KEY_LIVE`): active/trialing
     subscription counts and an approximate MRR (price unit amount,
     annual ÷ 12, coupon applied — approximate, not the accounting figure).
     **Cross-check this against the DB's `is_internal` flag before reporting
     it as real MRR.** Stripe has no concept of an internal test gym, so an
     active internal subscription (e.g. a stress-test account, or one left
     running past a walkthrough) inflates the raw Stripe number silently.
     Seen live on 2026-09-11: Stripe reported 1 active sub / ~€99 MRR while
     the DB's paying count (which excludes `is_internal`) read 0 — that one
     sub was the internal "Test Admin" gym, not a customer. State the real
     (non-internal) paying count from the DB as the headline figure, and
     mention the Stripe total only as a footnote when it disagrees.
   - **PostHog** (cookieless, EU): 7-day visitors + pageviews via the same
     HogQL host-rewrite `posthog-query.ts` uses (`NEXT_PUBLIC_POSTHOG_HOST`
     with `.i.posthog.com` → `.posthog.com`, `POSTHOG_PROJECT_ID` +
     `POSTHOG_PERSONAL_API_KEY` against the private query API). Most of
     casdey's traffic so far is Davide himself (Europe/Rome), so read small
     visitor numbers with that in mind.

3. **Engineering / software** — no script, read directly:
   - `git log --since="7 days ago" --oneline` (repo root) for what actually
     shipped. Group by area (web feature, migration, plan/doc, skill) rather
     than listing raw commit lines.
   - `web/SAAS_V1_PLAN.md` and `web/SAAS_V1_1_PLAN.md` for what's still open —
     read the status tables/track headers, don't re-litigate the reasoning
     inside each track. `SAAS_V1_1_PLAN.md` is the current phase (V1 shipped
     2026-09-07); `SAAS_V1_PLAN.md` §7's board is now historical.
   - Any `Deferred`/`Still open`/`Not done` bullets flagged in `CLAUDE.md`
     itself are fair game too, but don't re-read the whole file every run —
     the plan docs are the maintained source for open items.

4. **Business overview** — `npm run hq -- summary` (from `web/`) for the
   goals, open to-dos, who does what, the fixed monthly cost, the offer and
   the marketing plan. Prices, per-gym economics and break-even are computed
   live on `/admin`'s Business tab (`src/lib/unit-economics.ts` against
   `src/lib/pricing.ts` and the cost lines), so do not recompute them here;
   flag only if a cost line or the offer text looks out of date against what
   sections 1-3 found. `casdey-hq.md` is retired (2026-09-19): do not read it
   as current, and never edit it.

5. **Recommended signals & this week's actions — synthesized, not sourced.**
   **Recommendations, not the plan (Davide, 2026-09-13).** Title it exactly
   "Recommended signals & this week's actions" in the week's check-up, with a line
   saying the real plan is decided in the review. This section is what Claude
   proposes going into the review; what actually gets done that week is
   decided by Davide, together with Claude and the `/hormozi` lens, in the
   Sunday review (or whenever the check-up is run with him). Record the
   decided actions in the review, not here.

   **Judge everything against Davide's current goals** and state the gap to
   each one:
   - **1% engaged leads**, set 2026-09-13 for the week ending 2026-09-20 (from
     0.11%). **Measured on the week, not all time** (agreed 2026-09-13): new
     interested gyms from that week's outreach over gyms first contacted that
     week, so about 7 from about 700. The all-time rate is dragged down by
     every earlier cohort and would need about 16.
   - **2 paying gyms by 2026-10-13.** The monthly goal; the engaged-leads
     rate is the lever Davide chose to reach it.
   When a goal's date passes, say whether it was hit, and ask Davide for the
   next one rather than inventing it.

   Distinct
   from the four above: nothing here comes from an API, it's what the other
   four sections mean taken together. Skipping it (or reducing it to a
   generic "keep going") defeats the point of running this weekly — a
   snapshot with no verdict is trivia, not a check-up. This section is what
   makes the check-up worth Davide's attention rather than something he
   skims past: the four data sections say what happened, this says what to
   do about it.

   Always run these specific checks, since they recur and are easy to miss
   just by eyeballing the raw numbers:
   - **Weekly test review cadence**: every running test's
     `liveReview.reviewOverdueDays`. If a review is overdue, say so
     explicitly and by how many days — this slipped silently for over a week
     before 2026-09-12. On a Sunday on-demand run the review is not just
     flagged, it is done in the same session (1b).
   - **Reply rate vs the 3% target**: state the gap in percentage points.
   - **Engaged leads**: the count, the rate, and who they are, email and
     Instagram (`inboundDms`) shown by source.
   - **Instagram posting cadence**: `igContent.behindBy`. The plan's one rule
     is not to stop (*$100M Leads* pg 145), so a gap of 2+ days is worth an
     action; also name drafts awaiting review and open feedback, since
     unreviewed posts are what stalls the cadence. Judge content on inputs
     (posts published) before day 30 (2026-10-15), not on reach.
   - **`/admin`'s written notes vs what Numbers/Marketing just found**: already
     flagged in section 4 above — surface it again here if it changes what
     Davide should actually do (e.g. the offer note still describes a price
     that has changed), which is worth an `npm run hq -- note set offer`, not
     just a footnote.
   - **Items stuck across multiple runs**: before writing this week's check-up
     note, read last week's (`npm run hq -- checkup get`) and the
     open to-dos (`npm run hq -- todo list`), and compare them against what
     this run just found in `SAAS_V1_PLAN.md`/`SAAS_V1_1_PLAN.md`. An
     item that reads "still open"/"todo" two check-ups running is itself a
     signal worth naming, distinct from an item that's simply new this week.

   Close with **1-3 ranked, concrete actions**, addressed to Davide
   directly, in imperative language ("Run the T0/T1 weekly review, it's N
   days overdue" not "the review could be looked at sometime"). Order by
   leverage, not by section order, and when Hormozi's framing genuinely
   applies (More/Better/New, the Value Equation, LTGP:CAC) name it, the way
   `.claude/skills/hormozi/` already does elsewhere — don't force it onto
   something that's just an ops gap. If nothing rises to the level of an
   action this week, say that plainly ("no action needed, still running
   clean") rather than inventing busywork: a check-up that always finds
   three things to worry about stops being trusted the moment nothing is
   actually wrong.

## Composing the output

**Chat summary** (every on-demand run): lead with section 5's ranked actions
(or its "no action needed" line), not buried at the end — that's the part
worth reading first. Then short, headline numbers only, one or two lines of
takeaway per section, and call out anything that looks wrong or
contradictory across sources (the Stripe-vs-`is_internal` MRR check above is
exactly this kind of thing). End with a link to https://www.casdey.com/admin.

**Into `/admin`** (every run, on-demand or weekly), all from `web/`:

1. **This week's analysis**, shown on `/admin`'s **Check-up** tab. Each
   Sunday gets its own note, so earlier weeks stay readable there. Write it in the small Markdown `/admin` renders (## headings,
   - lists, **bold**): the ranked actions first, then one or two lines per
   section, then the proposed test verdict. Keep it short; the numbers
   themselves are live on `/admin` and must not be copied into it, or they go
   stale the moment the page reloads.
   `npm run hq -- checkup set <file.md>` (it keys the note by the latest
   Sunday; pass `--week YYYY-MM-DD` for another week)
2. **The recommended actions as proposed to-dos**, one each, so Davide can
   accept or dismiss them on `/admin`:
   `npm run hq -- todo add "<imperative title>" --detail "<why, one line>" --source checkup --proposed`
   In an interactive review with Davide, add only the ones he agrees to, and
   without `--proposed`. Do not add a to-do for anything `/admin` already
   raises by itself as a live signal (an engaged lead, an overdue test review,
   Instagram posts to approve, DMs to send, a first week ending, a goal past
   its deadline): see `web/src/lib/hq-signals.ts`.
3. **Goals** (interactive review only). Davide gives the week's goals in the
   Sunday review. Close the old ones and add the new:
   `npm run hq -- goal close <id> hit|missed|retired`, then
   `npm run hq -- goal add "<label>" --metric engaged_rate_week|paying_gyms|reply_rate_week --target N --unit percent|count --deadline YYYY-MM-DD`
   (`goal list` shows ids). A goal `/admin` cannot measure gets no `--metric`.
   Never set or change a goal from the unattended routine.

**The old artifact is retired.** It was https://claude.ai/code/artifact/e527486a-6a23-4267-8d4e-f9722adbdbbe
(first published 2026-09-11). Do not republish it.

## The weekly routine

Runs automatically every Sunday via a scheduled Claude Routine (set up with
the `schedule` skill, same mechanism as the two outreach routines in
`CLAUDE.md` "Stage 1 progress" — this is a third one, not part of either
existing outreach routine). It has no chat to reply into, so the delivery
step is different from an on-demand run:

0. **`cd web && npm ci` first.** A cloud routine's checkout has no
   `node_modules` (found the hard way on the first live run, 2026-09-11:
   `checkup:numbers` failed with `Cannot find package 'pg'`). Local runs
   already have it installed, so this is a no-op there.
1. Do everything above (all sections including the prepared test review and
   the recommended actions), and write them into `/admin` as "Composing the
   output" describes: the week's check-up, and each recommended action as a
   *proposed* to-do. Goals are never set from the routine. **Never run `testlog:update` from the
   routine**: with nobody to decide, the review stops at the proposed
   verdict, and the Sunday session with Davide finishes it.
2. Send Davide a **short "ready" email** (Davide, 2026-09-19): the top 1-3
   actions and the link to https://www.casdey.com/admin, nothing else. No
   numbers, since they would only duplicate `/admin` and go stale:
   `node scripts/send-email.mjs davide@casdey.com "casdey check-up — <date>" <path>`
   (`web/scripts/send-email.mjs`, the same Zoho OAuth account
   `src/lib/zoho-mail.ts` already sends from).

Set up once via `/schedule`, weekly, Sunday. **All three casdey routines now
fire at the same `02:00` UTC slot (2026-09-13, Davide's call: 4am Italian
time so the 5-hour usage window resets by ~9am, before he starts working)**
— they run as independent cloud sessions in separate environments, so this
is fine operationally, just worth knowing if their reports/emails ever land
suspiciously close together. See `CLAUDE.md` "Infrastructure" for the
pattern (`RemoteTrigger`, not a repo cron).

**Credentials in a cloud routine.** A routine runs in its own cloud
checkout, with no `web/.env.local` and no local service-account key file, so
all three scripts (`check-up-marketing.mjs`, `check-up-numbers.mjs`,
`send-email.mjs`) read `process.env` first and only fall back to
`.env.local` for local runs. The Google service-account key specifically
needs `GOOGLE_SERVICE_ACCOUNT_JSON` (the key file's raw contents) set as an
env var on whichever cloud environment the routine uses — a path
(`GOOGLE_SERVICE_ACCOUNT_FILE`) only works locally. If a weekly run's email
never arrives, `RemoteTrigger action:"list_runs"` then `get_run_log` on it
first — a missing env var on the routine's environment is the most likely
failure, not a bug in the scripts.

**Confirmed working end to end, 2026-09-12.** The `casdey-Outreach`
environment (`env_016U3DW3QNJS1t7AyukzK5RN`) now carries all of
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY_LIVE`,
`POSTHOG_PROJECT_ID`, `POSTHOG_PERSONAL_API_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`,
on top of the `ZOHO_*`/`GOOGLE_SERVICE_ACCOUNT_JSON` it already had, plus a
Setup script (`cd web && npm ci`) so `node_modules` exists before the skill's
own steps run. A live routine run that morning confirmed all four sections
populate with real data and the email sends cleanly.

## What this deliberately does not do

- It does not decide the weekly test review. It computes the numbers and
  proposes a verdict; the winner is Davide's call (1b).
- **The one write it may make is the `Test Log` row**, via
  `scripts/test-log-update.mjs`, in an interactive session, after Davide has
  made that call. Nothing else in the outreach sheet, and never from the
  unattended routine.
- It does not edit `CLAUDE.md` or the plan docs — it reads them. Use `/update-project` for that, separately, if a check-up surfaces
  something worth recording.
- **In Supabase it writes only casdey HQ's own tables** (`hq_notes`,
  `hq_todos`, and in an interactive review `hq_goals`), through `npm run hq`.
  Never gym or member data, never Stripe, and it does not change the live
  outreach routines (setting up the next test is its own step, 1b.6).
- **Section 5 recommends, it does not execute.** Naming an overdue review or
  a stuck plan item is not the same as doing it — that still needs an
  explicit follow-through, by Davide or in a separate session/turn, the same
  as any other finding this skill surfaces. Adding the recommendations
  section does not loosen the read-only rule above.
