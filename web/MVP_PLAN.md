# Casdey MVP: the live analysis and the paid plan

Decided with Davide on 2026-10-05. It replaces the waitlist on www.casdey.com.
Why: `memory.md` §1 "Next steps" and the ledger entries of 2026-10-05. This
file is the build spec; tick phases off as they ship.

## The flow
1. **Quiz, about 2 minutes.** Goal (body / face and skin / style / discipline),
   age with an **18+ gate**, height, weight, training, sleep, skin, hair,
   style. Every answer feeds the plan, so the plan feels like theirs (the
   MacroFactor effect: investment raises the expectation).
2. **Honest line at the start:** "Free analysis. The full plan has a free
   trial." No surprise paywall: trust is differentiator 3, and "price only
   after the photos" is Umax's top complaint.
3. **Photos.** Face required, full body optional.
4. **Email** to see the result (also how launch news reaches them later).
5. **Free analysis, instantly:** the honest top 3 levers with a first step
   each. **No score, no number.** Never comment on what a person can't
   change. A copy goes by email.
6. **"Your 90-day plan is ready":** built from their answers, week 1
   visible, the rest locked.
7. **Paywall:** **7-day free trial, card upfront**, then **€9.99/month or
   €59.99/year** (annual shown first). Price stated plainly. One-tap cancel.
   An email on day 6 says exactly what will be charged and when.
8. **Inside:** today's plan, a daily photo check-in checked by AI
   (differentiator 1), streaks, progress photos over time. Davide reviews by
   hand while numbers are small.

## Phases (each one can ship alone)
- **A. Quiz + photos + free analysis + email.** **Built 2026-10-06** on
  branch `mvp-phase-a` (not live until pushed to `main`): `/analysis`,
  `/api/analysis`, `src/lib/{quiz,analysis,analysis-email}.ts`, Supabase
  table `analyses`, waitlist form and route removed, privacy notice rewritten,
  `/admin` counts analyses as signups. Model `claude-opus-5-5`, effort medium,
  server-side refusal fallback on; about 15 s per analysis. Needs
  `ANTHROPIC_API_KEY` in Vercel before it goes live. Original spec: Replaces the waitlist form on
  the home page. Claude vision via `ANTHROPIC_API_KEY` (in the root
  `.env.local`; add to `web/.env.local` and Vercel). Photos are processed and
  **not stored** unless the person starts the trial. Leads go to Supabase
  (extend or replace `waitlist`). PostHog events per quiz step, to see the
  drop-off.
- **B. Plan preview + paywall + accounts.** Supabase auth (magic link). Stripe
  Checkout subscription with `trial_period_days: 7`, EUR, monthly and annual
  prices (new; part 1's price ids are gym tiers, unused). Customer portal for
  cancelling. Webhooks for status.
- **C. The platform.** Daily plan, check-in upload with AI verification,
  streaks, progress timeline. `/admin` view of clients and check-ins.
- **D. Trial honesty.** Day-6 reminder through Resend, plus Stripe's own
  trial-ending email.

## Before money is taken (blocking phase B going live)
- **Partita IVA: not blocking.** Davide, 2026-10-05: deal with it once
  money actually comes in, not before. Background in `memory.md` §5.
- **Privacy notice** rewritten: face photos (sensitive in practice), Anthropic
  as processor, retention and deletion, 18+.
- **Terms:** subscription, trial, cancellation, and the EU 14-day withdrawal
  right for digital services (express consent to start immediately).

## Not now
The iOS app, scores, referral programme, paid ads (until a hook and the
funnel convert), the full new brand.
