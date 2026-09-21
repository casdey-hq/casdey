# casdey improvements list (September 2026)

Davide's list, sent 2026-09-19, recorded **verbatim** and never paraphrased (the same standing rule as `web/D1_WALKTHROUGH.md`). Numbers are added for reference only; the order is his. Status and working notes go in the board below the list, never inside his words.

## The list, verbatim

1. Connecting Claude to your personal life more? AKA to Notion (read-only), so it knows your goals... and maybe having to create a separate folder for my personal life that complements casdey folder
2. Figure out how to deal with the fact that you have a casdey HQ, the checkup report, the marketing plan, what my inputs are (specify when you chat with Claude), the goals to reach for business, and the /admin... it would be nice having everything in one place that gets updated LIVE.
   (So maybe if you turn down the check up REPORT, then what you'll do is just run the SKILL every Sunday so that you can work on analysis and improvements for the following week)
   Everything could be simply merged into the /admin page, but the problem that would be there is the fact that, unlike for the website data, stuff like the report, marketing plan etc is stuff that needs to be pushed manually by me, so it wouldn't be fully live... ask Claude for a solution
   Oh and BTW with merged I mean that no data or feature has to be lost. But of course the duplicates of a same data shouldn't be there.
3. Getting in the US market
4. Maybe in that /admin or whatever thing where you'll have everything in one place, besides the fixed inputs (which you have on notion), there could be also the section with other to-dos (think like, I don't know, respond to that guy, or whatever that is beyond the fixed inputs also based on the checkup and needed improvements)
5. A more attio/cursor/vercel type of UI (so it looks more professional, it suits better a software, and doesn't look like AI slop)
6. In the what counts as lapsed, the check in after should be freed from the lapsed number and not be mandatorily less than the lapsed number
7. In the where else it can come from in the import CSV section, the LegitFit link is wrong and the right one should end with /support… it would be nice putting a dropdown for each of them with a video or a guide that tells them what to do
8. In the WhatsApp section, there has to be a guide, even a video one if possible, on how to setup a WhatsApp business account and how to plug it in to casdey. Same thing for how to setup the sending domain and connect the DNS.
9. In many places there is a "we could not save that. Try again" message. It would be much better that instead of saying that it said why (like "you have to do X before saving" or something like this so that the client isn't confused)
10. There's calendar booking thing isn't very clear… it's not clear as a whole how it works, what the clients receive in the email, where you can see the booked clients, etc… it needs to be looked at completely again
11. It's unclear how to setup the "reasons" and associate them with members in the list.
12. Go through each page and change not only the UI (based on what has already been said in another point), but also look for fixes and improvements
13. 07davide.longo@gmail.com account should stay on the standard plan forever while the info@casdey.com should stay on the Pro plan forever
14. The recurring revenue lapsed number looks a little bit off… it is like summing the prices of all services and multiplying by the number of lapsed members (which is wrong)… I guess a mean of the prices with maybe some type of weight would be more realistic?
15. Our clients of course will have to import the CSV every once in a while. Right now of course we don't have direct integrations with the platforms, but we should at least have a thing like a reminder or something similar that tells them that they should import again an updated CSV
16. Add a live support page (at the moment I will personally be responding to customers… therefore I would also need to get notified when someone needs help)
17. Remove wrong info inside the project folder

**Davide's priority (2026-09-19):** #3 first (the gym outreach routine is struggling to find leads, and the US is the biggest market), then #2 and #4 together (#4 depends on #2).

**Current focus (2026-09-21):** #5 and #17 are done (see the board). #1 is a separate discussion for later. #3 waits for the Arlington mailbox provider's response before US outreach can go live.

## Board

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Personal Notion connection | set aside | Discuss separately with Claude later. |
| 2 | One live place for everything | done, live | `/admin` is casdey HQ, now with six tabs. See the notes below. |
| 3 | US market | blocked on mailbox | US signup, USD billing and pricing are live. The outreach switch is **built and deliberately off** (`.claude/skills/gym-outreach/SKILL.md`, "The US switch", on branch `gym-outreach-automation`); sending stays off while Davide waits for the Arlington mailbox provider's response about USPS Form 1583. |
| 4 | To-dos section | done, live | On `/admin`'s Overview tab: live signals, check-up proposals, and ones added by hand. |
| 5 | Professional product UI | done, live | V1.2: full signed-in workspace, casdey HQ, homepage and `/pricing` refresh. Charcoal default, one raised card plane, restrained dot texture, product navigation and interaction polish. Mobile public/admin elastic overscroll stays charcoal; the landing product story works on mobile with a side progress rail and scroll cue. Not yet moved to the dark system, by the code: `/waitlist`, `/contact`, `/privacy`, the terms pages and `/see`. |
| 6 | Independent check-in timing | done, live | Check-in timing no longer has to be below the lapse window. |
| 7 | Import export guides | done, live | LegitFit support link corrected; vendor export steps are expandable. |
| 8 | WhatsApp and sending-domain guides | done, live | Setup guides are present and recede after configuration. Actual WhatsApp sending still needs its approved sender and template. |
| 9 | Clear save errors | done for reported cases, live | Form validation explains missing information, including a blank new service. Provider failures can still need a retry. |
| 10 | Booking clarity | done, live | Setup and booking flow explained; the calendar has a direct Google Calendar fallback. |
| 11 | Cancellation reasons | done, live | Setup and member association explained; saved reasons card offers Close. |
| 12 | Page-by-page review | in progress | First pass fixed Overview labels and layout, Members search, phone-width page headers, homepage and pricing; the wider review continues. |
| 13 | Permanent internal plans | done, live | Davide's account has Standard and info@casdey.com has Pro independent of the cancelled Stripe subscription. |
| 14 | Lapsed recurring revenue | done, live | Estimate uses recurring membership prices and the gym's membership mix when counts are supplied. |
| 15 | Repeat CSV imports | done | Overview warns after four weeks; Import also shows the next suggested refresh date or a due state. |
| 16 | Live support | done, live | Gym chat, email notification, and the sixth `/admin` Support tab are shipped. |
| 17 | Incorrect project information | done (first audit, 2026-09-21) | Checked the docs against the code, the live database and the live site, and corrected: `web/README.md` (it still described a waitlist-only site pointing at GoDaddy with a light-only theme), `web/SAAS_HANDOFF.md` (homepage "redirects to /waitlist", migrations "through 0017", 164 tests, "never re-walked in production", eight prices), `web/SAAS_ONBOARDING.md`, `web/.env.example` (no USD prices, a "live prices by hand" note the script had outgrown), two stale code comments about the homepage redirect, `wiki/CLAUDE.md` (still "the dental SaaS", Abhi, the dental sheet), the dental `cold-outreach` skill's description (it advertised itself as live), and in `CLAUDE.md` the dental data-sensitivity note, the skill and `web/` bullets, the cold-email conventions, the HQ tab count, the migration count and the "UI refresh is unpushed" claim. **Left on purpose:** dated history in `CLAUDE.md`, `SAAS_ROADMAP.md`, `SAAS_V1_PLAN.md` and `D1_WALKTHROUGH.md`, which is labelled as superseded and records how decisions were reached. It is not wrong, only old, and rewriting it would lose the reasoning. |

## #3 US market, working notes

**Why now (2026-09-19):** the email routine still finds leads, but Europe has thinned out. The 2026-09-19 run sourced 149, spread across 64 smaller cities (Apeldoorn, Zwolle, Bergen, Faro), several cities returned none, and 103 of the 149 had only a generic info@ inbox.

**Product, built 2026-09-19 (commit on `main`, see git log):**
- The US is a country at signup, billed in USD, with a timezone choice (seven US zones, preselected from the visitor's own clock). Before this a US gym could not sign up at all.
- USD prices in the catalogue: Standard $99/mo ($990/yr), Pro $299/mo ($2,990/yr); the paid first week is $1. The 20% early-adopter coupon is a percentage, so it already covers dollars.
- Migration `0040_usd_currency.sql` (applied to the live DB 2026-09-19) lets three currency columns accept `usd`. Without it the first US payment would have been refused by the database after the card was charged.
- The Stripe webhook and the payment banner read Stripe's currency directly (`currencyFromStripe()`). They used to read "pounds, otherwise euros", which would have recorded a US gym's dollars as euros.
- `/admin` counts USD in MRR, cash collected and refunds. It used to skip any currency that was not EUR or GBP.
- CSV import: the date order defaults to the gym's country (month first in the US) and is read from the file itself when a date like 03/25 or 25/03 settles it. A wrong guess used to shift last-visit dates silently.
- Public site: visitors see prices in their own currency, from Vercel's `x-vercel-ip-country` (`src/lib/visitor.ts`); the pricing table gained a USD switch; "UK and EU" wording on the footer and contact page now includes the US.
- Stripe test mode has the four USD prices (ids in `web/.env.local`). A test-mode paid-week checkout in dollars was built and expired: $1 due today, 20% coupon applied to Pro only.

**Still open, in order:**
1. ~~Live Stripe USD prices and the four `STRIPE_PRICE_*_USD_*` vars in Vercel.~~ **Done 2026-09-19**: created with `npm run setup:stripe -- --live` (the eight existing prices untouched), set in Vercel Production and Preview, deployed.
2. ~~Campaign send time.~~ **Built 2026-09-19**: a gym's campaign email only leaves between 8am and 8pm in its own timezone (`src/lib/send-window.ts`), and the drain now runs at 03, 08, 13, 16 and 19 UTC (`web/vercel.json`), so every zone a gym can pick gets a daytime run. The trial job still runs once, on the 03:00 schedule only. Tested in `send-window.test.ts` and `sender.test.ts`, including a mutation check that the drain does not stop on a first page full of one resting gym.
3. The Arlington mailbox is paid for, but USPS Form 1583 still needs to clear. Davide is waiting for the mailbox provider's response about the identity documents before the address can be used. This gates US sending.
4. The US outreach switch has been built locally and is held off production. The intended routine is US-only first touches (big metros, CrossFit boxes and boutique studios first), a Country column in the Leads sheet, US emails scheduled for about 9am local with Resend's `scheduled_at`, the postal address and opt-out line on US emails. Europe keeps running until the switch is enabled; EU leads already contacted still get their follow-ups.
5. Import guides for US gym software (Mindbody, PushPress, Wodify, Zen Planner, ABC Glofox), which overlaps with item #7.
6. Known and accepted for now: US gyms text members by SMS, not WhatsApp, so Pro's WhatsApp channel is worth less there. Email is the core product.

## #2 + #4 One live place, with to-dos: working notes

**Decided with Davide, 2026-09-19:**
- `/admin` becomes the one place. Nothing in it is pushed by hand: each piece is either computed live (numbers, the weekly test review, prices from the code, per-gym economics, break-even, status) or stored in the database and shown instantly (marketing plan, cost lines, goals, inputs, to-dos, the Sunday analysis). Claude writes to it with a script in a session, Davide edits or ticks things off in `/admin`.
- The **casdey HQ** and **Marketing Plan** Google Docs and the **check-up artifact** are retired once their content is in `/admin`: each gets a final line pointing there, nothing is deleted.
- The Sunday check-up keeps running and writes its analysis and proposed actions into `/admin`. Davide gets a **short "ready" email**: the top 1-3 actions and a link, no numbers.
- **Goals:** Davide gives them in each Sunday review; Claude stores them in `/admin`. Not linked to Notion.
- **To-dos (#4)** come from three places: live signals (an interested gym waiting for a reply, an overdue test review, Instagram posts to approve, a trial about to end), proposals from the Sunday check-up that Davide accepts or dismisses, and ones Davide or Claude add directly.
- **Inputs, as Davide gave them (verbatim, to seed `/admin`; update when things change):**
  - My inputs: Approve email responses; Send IG DMs; Approve Instagram posts (every sunday or whenever); Sunday's check-up; And of course look for improvements and updates
  - AI inputs: Finding leads, drafting emails and sending cold email outreaches (both first touches and follow ups); Finding IG leads, drafting DMs; Drafting batches of IG posts
  - Inputs collaboration (where we work together): Improving the software; Improving the marketing side system; Reasoning on what to improve

**Built 2026-09-19:**
- `/admin` has six tabs. **Overview**: to-dos, goals with live progress, who does what. **Numbers**: the previous `/admin`. **Marketing**: outreach, the weekly test review and its history, Instagram, the plan (editable). **Business**: the offer, prices from the checkout's catalogue in all three currencies, per-gym economics, cost lines, break-even. **Check-up**: Sunday analyses and proposals. **Support**: gym conversations and feedback.
- Migration `0041_hq.sql` (applied live): `hq_notes`, `hq_todos`, `hq_goals`, `hq_inputs`, `hq_costs`, readable and writable by the server only.
- `npm run hq` (`web/scripts/hq.mjs`) writes all of it from a session or the Sunday routine; `npm run hq -- summary` prints it for any agent starting a session.
- Seeded from the old sources: Davide's inputs verbatim, the two current goals, the marketing plan verbatim, the offer (updated for the US and the VAT line), the cost lines, and the HQ doc's open items as to-dos.
- The Sunday check-up now writes its analysis (one note per week, shown on a fifth tab, **Check-up**, with earlier weeks kept) and proposed to-dos, and sends a short "ready" email (`.claude/skills/check-up/SKILL.md`). Added the same day at Davide's request, along with an **Added** and a **Due** date on every to-do (an automatic to-do's Added date is when `/admin` first saw it).
- Retired and removed, at Davide's request (2026-09-19, "I don't want my stuff to be messy"): `casdey-hq.md`, `npm run doc:push` and `web/scripts/google-doc.mjs` deleted from the repo (in git history); the casdey HQ and Marketing Plan Google Docs moved to info@casdey.com's Drive trash (recoverable until Drive empties it, 30 days). The old check-up artifact needs Davide to delete it himself (a delete needs his confirmation), so it is a to-do on `/admin`.
- Tested: 490 tests (new: `marketing-summary`, `hq-signals`, `unit-economics`), and every tab checked in the browser against live data, including phone width and adding and ticking off a to-do.
