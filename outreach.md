# Outreach playbook (started 2026-10-11, scaled back 2026-10-12)

Why it started: content brings views but almost no visits. Hormozi's Core Four
has three more channels; cold outreach is the free one. Davide sends every
message himself, from his own accounts. Claude writes, never sends.

**Update 2026-10-12 (Davide's call): outreach is optional, not a daily target.**
He hates it, Reddit's new-account limits make it slow (see below), and TikTok/IG
cannot be automated safely. The 50 to 100 a day target is dropped. What stays:
1. **Replies to our own comments** (warm, 5-10 min, no searching). Do this daily.
2. **The Reddit list and the screenshot-batch routine**, only when Davide feels like it.
3. **Decide on 2026-10-18** from the content test: if the best format brings real
   profile and site visits, outreach may not be needed. If not, pick the next
   lever then (a small paid boost on the best post is the main alternative, from
   the ~EUR 600 budget), not by grinding a channel he dislikes.

## Where the people are
1. **"Rate me" comments** under big looksmax videos on TikTok and Instagram
   (PSL App clips, mogging edits, "rate my face" posts). Search: `rate me`,
   `rate my face`, `looksmax rate`, `psl rate`. Sort by recent.
2. **Our own comments.** Every comment on a Casdey video gets a reply,
   within the hour if possible.
3. **Rate-me posts** (TikTok/IG posts where a guy asks to be rated). Only
   people who say or clearly look 18+. Skip anyone who looks younger, and
   skip anyone who sounds down on himself: we help, we never pile on.

## Reddit, every day (warm-up phase from 2026-10-12)
Davide posts from **u/casdey-com** (the only account; a duplicate made by Google
sign-in on 2026-10-12 was deleted). It is brand new, so Reddit rate-limits it
("wait 13 minutes") and r/truerateme auto-removes comments until it has user
flair. Both ease with karma and age, so for the first 1-2 weeks:
- **Help first, no link.** Every reply is real, specific advice. Only about 1 in
  4 replies, and only in r/looksmaxxing and r/malegrooming, carries casdey.com
  (marked WITH LINK in the list). Never in r/Rateme or r/truerateme.
- **Link in the profile bio** ("free face score: casdey.com"), so curious people
  click without the comment looking promotional.
- Apply for flair in r/truerateme (link in the AutoModerator message) before commenting there.
- Revisit after 2 weeks: if karma is up and nothing is being removed, raise the link ratio.

`node outreach/reddit.mjs` (a few minutes; Reddit throttles fast reads) writes
`outreach/lists/<date>.md`: new posts by men 18+ asking to be rated on
r/Rateme, r/truerateme, r/looksmaxxing and r/malegrooming, each with a
ready reply. It reads the public RSS feeds, because Reddit gates new API apps.
It also writes a CSV (columns: Done, #, Subreddit, Post, Link, Age, Link?, Reply), which Claude uploads with the `gws` CLI (signed in as info@casdey.com) as a Sheet in the info@ Drive folder "Casdey outreach" (id 1ClCql6jblqpBlw9H1PR38tcZevBPLO9n), one Sheet a day, so he works from his phone: `gws drive files create --json {name, mimeType spreadsheet, parents [folder]} --upload <csv> --upload-content-type text/csv`. Not the Drive connector: that one is Davide's personal account. The local lists stay out of git: they name private users. Look at the
photos and make the first sentence about him before posting.

## TikTok and Instagram: semi-manual (tested 2026-10-12)
Claude in Chrome can search TikTok ("rate me", "rate my face") and read posts and
comment text, but cannot judge age or gender from a photo and must not guess, and
reading hundreds of videos is slow and may trip bot detection. So:
1. Davide scrolls 15 minutes of "rate me" posts and screenshots the ones where a
   man, clearly an adult, asks to be rated. Sends the batch in one message.
2. Claude drafts all the replies in one pass (help first, casdey.com as text
   only on some). Davide posts them himself.
3. Optional: Claude pulls the list of "rate me" post links for him to open, so he
   doesn't have to search. The "drop your facecards" style videos are the right
   kind of source; edits, memes and gym content are not.

## The replies (rotate, edit the first line to the person)
- **A, a "rate me" comment:**
  "Run your photo through casdey.com, it's free and takes 2 min: you get
  your score, your 90-day potential and the 3 things holding you back. Post
  your score here after 👀"
- **B, someone who already got rated low by others:**
  "Ignore the numbers people throw around. What matters is your potential
  and what's in the way. casdey.com shows you both, free. Most guys are 1
  point away with 3 changes."
- **C, our own commenters:**
  "Thanks bro. Want yours? casdey.com, free: score now, 90-day potential,
  and the 3 changes that get you there."
- **D, a DM after someone replies or posts his score:**
  "Nice, a [X] with a [Y] potential is a real gap. If you want the plan for
  it, the 90-day plan has a 7-day free trial on the result page, and I check
  in with you every day. Any question, ask me here."

Rules: no links that look spammy on TikTok (write casdey.com as text), never
the same text twice in a row on the same video, never argue, stop after one
reply if they don't engage.

## Daily tally (write it in the Sunday report card)
| Day | Replies sent | DMs | Site visits (admin) | Analyses | Trials |
| --- | --- | --- | --- | --- | --- |

## Content test, 2026-10-11 to 2026-10-18
3 posts a day, spaced, evening-heavy:
1. a remake edit (reach),
2. a **score reveal**: a famous face edit ending on his real score, potential
   and 3 levers (`remake-edit` skill, `scorecard.mjs --levers`),
3. a **before/after potential**: "he's a 5.8 now, this is his 90-day
   potential", with the 3 changes.
Every caption starts with the CTA; every post gets a pinned comment
("free score + 90-day potential: casdey.com"). Judged on profile visits and
site visits per format, not views. On 2026-10-18 keep the winner.
