# Outreach playbook (started 2026-10-11)

Why: content brings views but almost no visits. Hormozi's Core Four has three
more channels; cold outreach is the free one. Target: 50 replies a day in week
one, then 100 (Rule of 100). Davide sends every message himself, from his own
accounts. Claude writes, never sends.

## Where the people are
1. **"Rate me" comments** under big looksmax videos on TikTok and Instagram
   (PSL App clips, mogging edits, "rate my face" posts). Search: `rate me`,
   `rate my face`, `looksmax rate`, `psl rate`. Sort by recent.
2. **Our own comments.** Every comment on a Casdey video gets a reply,
   within the hour if possible.
3. **Rate-me posts** (TikTok/IG posts where a guy asks to be rated). Only
   people who say or clearly look 18+. Skip anyone who looks younger, and
   skip anyone who sounds down on himself: we help, we never pile on.

## Reddit, every day
`node outreach/reddit.mjs` (a few minutes; Reddit throttles fast reads) writes
`outreach/lists/<date>.md`: new posts by men 18+ asking to be rated on
r/Rateme, r/truerateme, r/looksmaxxing and r/malegrooming, each with a
ready reply. It reads the public RSS feeds, because Reddit gates new API apps.
The lists stay local (gitignored): they name private users. Look at the
photos and make the first sentence about him before posting.

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
