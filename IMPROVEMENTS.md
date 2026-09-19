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

## Board

| # | Item | Status | Notes |
|---|---|---|---|
| 3 | US market | in progress | priority 1. Decisions (2026-09-19): **$99 / $299** a month; **all 100 first-touch emails a day go to the US** once live; postal address for US law (CAN-SPAM) decided later, and **US sending stays off until it exists**; Instagram DMs to the US later, after a separate discussion. **Product side built 2026-09-19** (see below). |
| 2 | One live place for everything | in progress | priority 2, with #4 |
| 4 | To-dos section | in progress | depends on #2 |
| 1, 5–17 | the rest | open | order to be agreed |

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
1. Live Stripe USD prices (`npm run setup:stripe -- --live`) and the four `STRIPE_PRICE_*_USD_*` vars in Vercel Production and Preview. Until then a US gym can sign up but checkout errors.
2. Campaign send time. Sends run once a day at 03:00 UTC, which is 11pm in New York. Send in each gym's local morning instead. Touches the send pipeline, so done as its own tested step.
3. The postal address for CAN-SPAM (Davide, decided later). Gates everything below.
4. The outreach routine: US-only sourcing (big metros, CrossFit boxes and boutique studios first), a Country column in the Leads sheet, US emails scheduled for about 9am local with Resend's `scheduled_at`, the postal address and opt-out line on US emails. Europe keeps running until this is switched on; EU leads already contacted still get their follow-ups.
5. Import guides for US gym software (Mindbody, PushPress, Wodify, Zen Planner, ABC Glofox), which overlaps with item #7.
6. Known and accepted for now: US gyms text members by SMS, not WhatsApp, so Pro's WhatsApp channel is worth less there. Email is the core product.
