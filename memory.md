# casdey memory

The long-form record: decisions with their reasoning, research, accounts, history
and hard-won gotchas. `CLAUDE.md` stays short and is loaded every session; this
file is read **on demand**, when a task touches one of these topics. Add to it
instead of growing `CLAUDE.md`. Dates are absolute.

Contents: 1. Part 2 (current) · 2. Accounts and services that exist · 3. Part 1,
compressed · 4. Gotchas worth not rediscovering · 5. Legal and tax (Italy)

---

## 1. Part 2: the glow-up app (current, started 2026-09-26)

### How the idea was chosen
- **Davide's rule: do something that already works.** Enter a proven, crowded
  market (many competitors means proven demand) and make it better. Part 1 went
  into a blue ocean and it was, in his words, suicide.
- **B2C**, software or app. Davide knows the audience from the inside and has
  real short-form content experience (a motivation/success/money TikTok account:
  about 1,000 followers in 3 days, videos at 500k and 400k views).
- **Method** (from a mikestrives reel plus Starter Story videos): browse
  trustmrr.com and acquire.com for apps with verified revenue, pick an existing
  idea, mine its reviews (App Store, Trustpilot, Reddit) for pain points and
  missing features, and make that gap the edge. Combine with Hormozi: Starving
  Crowd, niche the same product to an avatar ("X for Y"), sell before build.
- **Budget: about €1.7k** as of 2026-09-26. A part-time job is what buys the
  100+ days any app needs (RevenueCat 2026: even top categories take over 100
  days to reach $10k).

### Market research (2026-09-26)
- **Self-improvement pays, young audiences included.** Gen Z spends more on
  subscriptions than Millennials; the real limit is minors without a card, so
  target 18+. What works with young users is the model, not a low price:
  freemium top of funnel (Opal halved its conversion rate and doubled revenue to
  $10M+ ARR, two thirds of users are students), cheap annual plans (36% still
  subscribed after a year vs 6.7% on pricey monthly), upsells.
- Proof by area: **looks/glow-up** Umax $350-500k/mo, GoTall $46k/mo, FaceKit
  $20k, Dailyglowup $13k · **training** BetterMe $80M ARR (ad-driven), AbMaxx
  $17k, Brawler (AI boxing) $17k · **nutrition** Cal AI, TrackAI $20k (too
  crowded) · **discipline** Opal $10M ARR; stakes apps (stickK, Beeminder,
  Forfeit) are proven as a concept but show little revenue · **mindset** Finch,
  Headway, STOIC $8.8k (hard to stand out).
- A recurring complaint across every market: **billing dark patterns** (trials
  that silently convert, hard cancellation; Apple briefly pulled Cal AI in April
  2026 over it). Honest pricing is an edge almost anywhere.

### The decision: a glow-up app for men 18-28
- **Umax, the leader:** 4.6 stars from 52K App Store ratings (people love the
  scan-and-improve loop), yet JustUseApp scores its reviews 37/100. Complaints:
  price shown only after the photos are uploaded, one scan per weekly plan and
  $3.99-6.99 per extra scan, weekly-only pricing, "same photo, different score",
  crashes and hours-long scans, a dated UI, "cash grab". Face scores are also
  criticised for harming teenagers.
- **The "no scores, habits and plan" version already exists** (Mogged, GlowUp
  Daily, FaceMax, Glowup AI), so "no scores" alone is not a wedge.
- **The five differentiation points:**
  1. **Close the execution gap.** Apps rate you or tell you what to do; none
     makes sure you do it for the 3-6 months a transformation takes. One daily
     plan, AI-verified check-ins (a gym photo, the routine done), streaks,
     progress photos over time.
  2. **One integrated plan:** training (Davide's gym and kickboxing background),
     skin, sleep, posture, hair and style. Competitors each do a slice.
  3. **Total trust:** price shown before any photo, no per-scan charges, photos
     deleted if you don't subscribe, a free trial and a clear annual plan.
  4. **Apple-grade polish:** fast, crisp, addictive. Slow, ugly, crashing apps
     are among the top complaints.
  5. **Real-world appearance, not geometry:** how people see you in real life
     (style, posture, grooming), not a static photo against a template.
- **Keep the free scan as the hook** (Hormozi's lead magnet; it is what earns
  Umax its downloads): a free, unblurred first analysis giving your honest top 3
  levers, no fake number. The paywall is on the plan and the daily coaching.
- **Pricing: a normal subscription like the competitors.** Starting hypothesis
  to validate: about €4.99/week plus a discounted annual plan. A money-stakes or
  refund-on-completion mechanic was considered and rejected by Davide as
  unproven and complex; it may return later only as an offer test.
- **Promise to test (first draft):** "Glow up in 90 days. A real plan, checked
  every day, no fake scores."
- Rejected: the discipline-with-stakes app (modest revenue proof), nutrition
  (too crowded), mindset (hard to stand out), training alone (smaller ceiling).

### Marketing (B2C)
- **Short-form video is the main channel** (TikTok, Reels, Shorts), daily, for
  months. Creators/UGC early to speed it up (€20-100 a video or affiliate %).
  Communities, App Store search, launches as support. **Paid ads only after an
  organic video proves a hook.** In-product: fast "wow" in the first minute,
  trial and paywall, referrals, review prompts.
- Rough budget split agreed: setup €0-120, creator tests €300-400, ads after a
  winning hook €300-500, at least €500 kept aside.
- Tools: CapCut, warmed-up TikTok/IG/YouTube accounts, PostHog, Stripe (web) or
  RevenueCat (phone), Resend. Apple developer about €90/yr and Google €25 only
  for a phone app.

### Next steps (in order)
1. ~~Clean the project folder~~ (done 2026-09-26).
2. **Waitlist plus the first TikTok videos**, to test the promise and prices
   before building (sell before build, done properly this time).
3. At build time: **a whole new brand and aesthetic, Apple-grade** (the part 1
   v5 charcoal system is gone; the logo is kept only for now and will very
   likely change too), and the choice of iOS app vs web app.

---

## 2. Accounts and services that exist (state as of 2026-09-26)

Keys for all of these are in the root `.env.local` (the full part 1 set) and
`.env` (older Zoho / Google CLI keys). Never write a key value into a doc.

| Service | State |
|---|---|
| **Domain** casdey.com | GoDaddy. DNS: A → Vercel, Zoho MX/SPF/DKIM, Resend on `send.` and `mail.` subdomains, DMARC `p=quarantine` with no reporting address. |
| **Email** Zoho Mail (free) | davide@casdey.com, info@casdey.com (a Group, not a mailbox: API access goes through davide@ with send-as), abhi@ (dormant). |
| **GitHub** `casdey-hq/casdey` | Org on info@casdey.com. Only `main`. Part 1 lives at tags `casdey-pt1`, `casdey-pt1-gym-outreach`, `archive/codex/*`. Account has a password + 2FA; recovery codes are the only fallback. |
| **Vercel** project `casdey` (Hobby) | **Git disconnected and all deployments deleted on 2026-09-26: the site is down.** Project and env vars kept. Reconnect with `vercel git connect` **from the repo root**. |
| **Supabase** project `casdey` | eu-west-1 (Ireland), free tier, holds part 1 data (internal test gyms only; the one real gym was deleted). Auth mail goes through Resend SMTP. Free projects pause after inactivity. |
| **Stripe** `acct_1Tz17NDGwemFDmSP` | Live, EUR payouts to Revolut. Part 1 catalogue (Standard/Pro, 12 prices, 20% coupon). One internal test subscription ends 2026-10-07. The live webhook (www.casdey.com/api/stripe/webhook) was **disabled** on 2026-09-26 when the site went down; re-enable or repoint it in the dashboard if Stripe is used again. |
| **Resend** team "casdey" | Domain `mail.casdey.com` verified. Pro subscription **cancelled** by Davide on 2026-09-26. |
| **PostHog** EU Cloud | Cookieless analytics, part 1 project. |
| **Anthropic API** | Org "casdey" on info@casdey.com (Google sign-in), prepaid. Not the personal "Davide's Individual Org", which holds no keys. |
| **Twilio** | info@casdey.com (Google sign-in), upgraded, about $20 balance, no WhatsApp sender. |
| **Google Cloud** `casdey-gws-cli` | OAuth clients ("casdey web" for sign-in/Calendar, the gws CLI one), published. The service-account key file was deleted from disk 2026-09-26; make a new key if ever needed. |
| **Meta** app "casdey publisher" + Instagram `casdey.co` | Part 1's Instagram publisher; the account has the demo reel and one image pinned. |
| **Google Sheet** Casdey-Gym-Leads | info@ Drive, part 1's ~1,950 gym leads and send log. |
| **Claude routines** | All disabled 2026-09-26: gym outreach `trig_018wp58QLBbeuBPbMA6Fy1sU`, IG outreach `trig_01La223qWjwxoumG4z8gssL8`, Sunday check-up `trig_01GubuCj2D18de4BsMx7Yby9`. They run on Davide's own Claude plan and stop when his weekly usage runs out. |
| **Anytime Mailbox** (Arlington VA, for CAN-SPAM) | Cancelled by Davide 2026-09-26. |

Fixed monthly costs going forward: Claude (about €22), ChatGPT (about €23,
kept about 3 more weeks while Davide checks whether Claude's limits suffice).

---

## 3. Part 1, compressed (2026-07-31 to 2026-09-26)

**What it was.** A SaaS that found a business's lapsed customers and won them
back automatically, booking them straight into the owner's calendar, with a
"profit or nothing" guarantee. First for **dental practices** (July-August
2026), then pivoted to **gyms and fitness studios** (decided 2026-08-17,
executed by 2026-09-03), Europe and later the US.

**What got built** (all in the `casdey-pt1` tag): a Next.js 16 + Tailwind v4 app
on Vercel with Supabase (auth, RLS, 45 migrations), Stripe billing (Free /
Standard €99 / Pro €289, a €1 paid first week, a 20% lifetime early-adopter
coupon, a self-serve 30-day refund guarantee), CSV member import, lapse
detection, email campaigns through Resend with per-gym sending domains, a
WhatsApp channel (Twilio + Claude Haiku reply loop), Google Calendar booking,
per-member AI personalisation, PostHog analytics, an internal HQ at `/admin`,
a US market build (USD, timezones, month-first dates), a promo film at `/see`,
and an Instagram content pipeline (reels rendered in headless Chrome, a
publishing cron). Outreach ran as fully automated Claude routines: 100 cold
emails a day plus follow-ups, with weekly A/B tests reviewed on Sundays.

**The numbers when it stopped (2026-09-26):** 1,946 gyms contacted, about 5,000
emails, 27 genuine replies (1.39%), 3 real interested gyms (BodyActive
Skibbereen, CrossFit Kreis 9, CrossFit ST1), all silent after follow-ups, **0
member-list imports, 0 paying gyms**. Instagram DMs: 397 sent, 1 reply, 0
interested. Dental before that: 216 emails, 0 replies.

**Why it stopped (Davide's clean-stop call, 2026-09-26).** Replies were "no
thanks / please stop / not interested"; nobody said "interesting, but". The
value per gym was small (a few recovered €40/month members against a €289
plan), the one real ask (hand a stranger your member list) was high effort,
and Davide did not care about gyms. Read against Hormozi, the market failed
before the offer did. Wind-down: routines off, site down, the one real gym's
account deleted with a closing email, branches archived as tags.

**Lessons that carry over:**
- **Proven market first, product second.** Part 1 built a whole SaaS (V1, V1.1,
  V1.2) before anyone had ever used it; most of two months went into building,
  not selling.
- **Sell before build:** a waitlist, pre-sales or real usage before the build.
- **Interest is not demand.** "Sounds useful" and even "yes, send it" meant
  nothing until someone acted.
- **Tests on email wording can't rescue an offer.** Part 1 tested subject lines
  and CTAs for weeks and never tested the offer itself.
- **Automation needs quota.** The routines died for two days when Davide's
  weekly Claude usage ran out.
- **Autoresponders look like replies**; one "engaged lead" was a canned
  "we'll reply in 72 hours".
- Content without anything true to say (no users, no results) and on generic
  stock footage did not work; four posts, then retired.

---

## 4. Gotchas worth not rediscovering

**Supabase**
- `SUPABASE_URL` must be the bare project URL; a `/rest/v1` suffix breaks the
  clients.
- A new table with RLS needs **explicit grants** to `authenticated` /
  `service_role`, or the app silently sees nothing (hit twice in part 1).
- Auth's Site URL and redirect allowlist must be set for production, or OAuth
  and email links go to localhost.
- The default shared SMTP silently failed to deliver confirmation emails; use a
  custom SMTP (Resend).
- A PKCE password-reset link only works in the browser that requested it;
  verify a token hash on the server instead (`/auth/confirm`).

**Vercel**
- Run the CLI from the **repo root**, not the app subfolder (false "no git repo"
  errors, and a stray project got created once).
- The git integration can go silently dead while claiming "connected"; verify
  with an empty commit that actually deploys.
- Env vars added after a deploy need a redeploy; statically prerendered pages
  need `--force` to rebuild.
- Hobby: each cron runs at most once a day (but many crons are allowed).
- Transferring the GitHub repo detaches Vercel's GitHub App; reinstall it on the
  new owner.

**Webhooks and APIs**
- Register webhooks on **`www.casdey.com`**, never the apex: the apex answers
  308, and Stripe and Twilio treat a redirect as a failed delivery.
- An API key's scope is invisible until something calls what it can't do (the
  Resend sending key could not manage domains). Probe keys, don't trust "set".
- A Stripe call returning an object is not money moving. Test cards never
  trigger 3-D Secure; a real card did, and broke the day-7 conversion.
- Stripe: let Stripe own recurring charges (a Checkout subscription with a
  trial), because an off-session charge far larger than the approved amount
  gets challenged by the bank.
- Local dev and production shared one Supabase DB, so any encryption key must
  be byte-identical in both.
- Anthropic: check the org chip reads the right org before buying credit.

**Google**
- An OAuth app left in "Testing" kills refresh tokens after 7 days; publish it
  (non-sensitive scopes need no verification).
- `gws auth export` needs `--unmasked`, or Google answers `invalid_client`.
- The Drive connector cannot write file content; a service account with the JWT
  grant can.

**Email and outreach**
- Cold email: SPF/DKIM/DMARC all passed and landed in Gmail's Primary inbox.
  Reporting DMARC to your own inbox floods it.
- US cold email (CAN-SPAM) needs a physical postal address in every email. A
  virtual mailbox needs USPS Form 1583: a valid passport plus a second ID from a
  short list (voter card, lease, insurance, vehicle registration), in English or
  certified-translated; an Italian CIE is rejected.
- Push discipline: any commit left on `main` is one unrelated push away from
  going live; work that must not ship belongs on a branch.

---

## 5. Legal and tax (Italy)
- No Partita IVA yet. **Prestazione occasionale probably does not fit** recurring
  subscriptions (habitual activity makes a Partita IVA obligatory, see Agenzia
  delle Entrate interpello 63/2024). Parked until money comes in; needs a
  commercialista. Regime forfettario is the likely route.
- No VAT was charged at checkout in part 1 (no Partita IVA to charge it under).
- Consumer penalty clauses are risky in the EU (Ireland applies the old penalty
  doctrine; Germany's §307 BGB voids unfair standard terms).
- Personal data: GDPR applies to anything about EU users; face photos would be
  sensitive in practice (biometric-adjacent), so plan storage, consent and
  deletion carefully for the glow-up app.
