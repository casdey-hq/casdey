# Content plan and log

The daily content plan and the log of every edit made. **Claude reads this at the start of any edit request and updates the log after every delivery**, so Davide never has to remember what was agreed. Test window: 2026-10-11 to 2026-10-18 (why and how it is judged: `outreach.md`, "Content test").

## The plan: 3 posts a day, spaced, evening-heavy
| # | Format | What it is | How it is made |
| --- | --- | --- | --- |
| 1 | **Remake** (reach) | A looksmaxxing edit remade from an inspo, same cuts, song and hook, new footage. The "classics" made until 2026-10-10. | `/remake-edit`, deliver as 1080x1920 `_shorts` |
| 2 | **Score reveal** (conversion) | A famous face edit that ends on his real score, 90-day potential and the 3 levers. Card sits at the end, at least 3.5 s. | `/remake-edit` with `analyse.mjs` then `scorecard.mjs --levers` (the Marlon selfies one is the first) |
| 3 | **Before/after potential** (proof) | "He's a 5.8 now, this is his 90-day potential", with the 3 changes shown. | Davide sources glow-up / before-after inspos (single person, clear before and after shot); Claude remakes with new before/after pairs and ends on the card (score, 3 levers or potential). First one still to come |

Rules for every post:
- Caption starts with the CTA. Pinned comment: "free score + 90-day potential: casdey.com".
- The score on any card comes from the live analysis, never typed in.
- Judged on profile visits and site visits per format, not views. On 2026-10-18 keep the winner (Hormozi: more of what works).
- Nothing is posted by Claude. Davide posts; he fills the Posted and Result columns.

## Log
Status: `sent` (delivered, waiting for a verdict) · `approved` · `rework` · `posted` · `dropped`. Finals live in `C:\Users\GIUSEPPE\Desktop\casdey-finals\`.

| Date made | Format | Edit | Final file | Status | Posted | Result (profile / site visits) |
| --- | --- | --- | --- | --- | --- | --- |
| before 10-11 | remake | hullo v2 | `hullo-edit-remake-final.mp4` | approved | ? | |
| before 10-11 | remake | looxmaxxing v2 (Lachowski) | `looxmaxxing-lucky-remake-final.mp4` | approved | ? | |
| before 10-11 | remake | merax Marlon | `marlon-edit-remake-final_shorts.mp4` | approved | ? | |
| before 10-11 | remake | Marlon "man what are you doing" (card) | `marlon-man-what-are-you-doing-card-final.mp4` | approved | ? | |
| before 10-11 | remake | Marlon security | `marlon-security-mogged-remake-final_shorts.mp4` | approved | ? | |
| before 10-11 | remake | Sean O'Pry v2 (card) | `sean-opry-model-card-final_shorts.mp4` | approved | ? | |
| before 10-11 | remake | Marlon mogs Duke v3 | `marlon-mogs-duke-final_shorts.mp4` | approved | ? | |
| 2026-10-11 | remake | Marlon "with-in" (n8) | `marlon-within-final_shorts.mp4` | sent | | |
| 2026-10-11 | remake | Ian and Paul "best duo" (n9) | `ian-paul-best-duo-final_shorts.mp4` | sent | | |
| 2026-10-11 | score reveal | Marlon selfies + score reveal (n10) | `marlon-score-reveal-final.mp4` (and `marlon-selfies-final.mp4` without the card) | sent | | |
| 2026-10-12 | remake | Clark Kent "why handsome men date ugly women" (n11, Tom Welling) | `clark-kent-handsome-final_shorts.mp4` | approved | | |
| 2026-10-12 | remake | Marlon B&W selfie montage (n12), no card. The card version (8.7 now / 9.5 potential, 2.4 s, no levers) was dropped | `marlon-selfies-2-final_shorts.mp4` (card version: `marlon-score-reveal-2-final_shorts.mp4`) | sent | | |
| 2026-10-12 | remake + card | "3 ways to make a girl text YOU first" (n13, Cam / itscamsworld). Card 2.25 s, no levers, 7.8 now / 8.8 potential (5 frames scored 7.0 to 8.4, used the one nearest the median) | `jester-text-first-card-final_shorts.mp4` | approved | | |
| 2026-10-13 | remake | Ian Somerhalder red-carpet edit, 47 fast cuts (n14), no card | `ian-red-carpet-final_shorts.mp4` | dropped (Davide: "probably the worst video you ever did"; weak sources) | | |
| 2026-10-13 | remake | "why are u single? because I am ugly" (n16): intro kept whole, pretty-boy montage replaced (Cam, Parsa, jrx.jace, Vinnie as a still, hooded qayro9), no card | `ugly-single-pretty-boys-final_shorts.mp4` (v2: re-centred with the centre.jpg gate; slot 5 recast from p6rs9 to drop a watermark) | sent | | |
| 2026-10-13 | remake | Marlon "mogged" (n17, inspo @darkzzzyx, 1.5M plays): bodyguard-in-crowd hook kept whole, the 13 Marlon slots recast from his own TikTok @marlon3lg (8 clips, 1080x1920), no card | `marlon-mogged-n17-final_shorts.mp4` (v2: re-centred after Davide flagged framing) | sent | | |
| 2026-10-13 | remake + card | "They should kill all short guys" model-flash edit (n18, inspo @adam44qkq, 1.4M plays): hook kept, 114 portrait-flash frames rebuilt with 12 models (Palvin, Bieber, Gigi and Bella Hadid, Cindy Kimberly, Sweeney, Swanepoel, Hosk, Shayk, Kylie Jenner, Taylor Hill, Strijd) on the inspo red/white timing, no red close-up (v4: Davide cut the Bella reveal; the girl clip stays and the cards start at 9.63 s), PSL app cards replaced by 5 Casdey cards cycling on the PSL beats (v2): Sweeney 8.6/9.3, Taylor Hill 9.3/9.8, Hosk 9.1/9.8, Kylie Jenner 8.3/9.0, Bella Hadid 9.4/9.9 (score-frame.mjs; live tool refuses retouched shots; multi-face template in the scratchpad, multi.cjs) | `psl-short-guys-models-card-final_shorts.mp4` | sent | | |
| 2026-10-14 | remake | Street-interview to model-portrait morph (n19, inspo @void_433, 1.0M plays), no card: interview and her close-up kept whole (VOID tag removed everywhere; v2: Davide said the video was perfect except the captions, which the inspo cuts off at the bottom of the frame from the close-up on, so the 13 close-up captions were redrawn in Palatino Bold at the wide-scene height, same word frames, and the bottom 70 px of the interview fades to black to hide the old text), the 7 model flashes recast as Sara Sampaio, Elsa Hosk, Cindy Kimberly, Sydney Sweeney, Josephine Skriver, Bella Hadid, Madison Beer on the inspo dissolve timing (Cindy fades through white like the inspo) | `void-stacy-morph-final_shorts.mp4` | sent | | |
| 2026-10-14 | remake | Marlon "walks in" reaction-show edit (n20, inspo @scimmiaofthenetwork, 402k plays, 1080 square, 60 fps), no card: the interview hook kept whole (frames 0-1425), Marlon rises in blurred over the interviewer, then 8 clips (grey tee, black hood, cap on a skyline, full body at the pool, LA cap, hood in the garage, dark night, hood and cap in the kitchen) recast from his own TikTok @marlon3lg with the inspo whip-blur on every cut, white flash on the pool shot, the second pass repeating the same 7 moments like the inspo; per-slot darkening to the inspo mood | `marlon-reaction-walks-in-final_shorts.mp4` | sent | | |
| 2026-10-14 | remake + card | "Same person btw" (n21, inspo @footie.cel, 738k plays, 1080 square band, 24 fps): v1 recast the subject as Francisco Lachowski without asking (Davide: "why did you change the subject"), v2 keeps HER (Livia Nunes, from the inspo tags): 11 Pinterest photos on the inspo cut frames, girl-to-cap dissolve kept, caption redrawn, PSL card replaced by the Casdey card at 13.38 s (1.83 s, no levers): 8.9 now / 9.6 potential, indicative (score-frame.mjs mean of 3 photos, tool calibrated on men) | `same-person-btw-livia-card-final_shorts.mp4` (v1 Lachowski: `same-person-btw-lachowski-card-final_shorts.mp4`) | dropped (Davide: "you are not good at this edit", v2 with her) | | |
| 2026-10-15 | remake | "Type of girls that love my bro / How bro looks" (n22, inspo @bananenfresser05, 1.7M plays, 1080 square band in 9:16, 60 fps), no card: cosplay-girl hook kept (frames 0-508), 7 guys recast on the inspo cut frames (curly in car, Cam, cap profile, Parsa in B&W for the bandana run, curly tattoo guy in blue, hood, cap by the trees), both captions redrawn at the inspo size and position; sources from TikTok (p6rs9, itscamsworld, mure843, vhackerr) and Pinterest | `bro-looks-pretty-boys-final_shorts.mp4` (v3: the captions had vanished from frame 1106 to the end because a stream-copy join reset the frame counter, and the two Vitaly clips had been shrunk into a smaller inset square; both fixed. v2 after Davide: B&W run re-cast with Cam on 1080 sources so the face stays centred, the two before the last swapped for clean Vitaly profile clips, caption frames re-checked; v1 had plain-looking guys and a face cut in the B&W run, which became two new rules in the remake-edit skill) | sent | | |

## Open
- Format 3: agreed 2026-10-12 that Davide finds the glow-up inspos; Claude remakes them. If before/after source pairs are thin, say so instead of shipping a weak one. Only the first example will show whether the format works.
- Older rows say "?" under Posted because it was never recorded; Davide corrects them once.
