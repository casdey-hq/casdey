---
name: remake-edit
description: Remake a short-form video edit from an inspo file. Davide drops a downloaded edit (TikTok, Reel, Short); Claude maps every cut, keeps the parts that ARE the edit (hook clip, text, stickers like the MOGGED bar, the song), replaces the other shots with new footage in the same style, cut on the same frames, and renders the remake with ffmpeg. Use when Davide shares an inspo video and says "remake", "replicate", "copy this edit", "same edit with other clips", or pastes his Notion to-do about it.
---

# Remake an edit

Goal: Davide gives only the inspo file and gets back a remake that plays exactly
like the original (same length, same cut points, same song, same hook, same
text and overlays) but with new footage wherever the footage is replaceable,
so it is not a clip-for-clip copy.

## Hard rules
- **RULE ZERO: THE SUBJECT IS CENTRED AND NEVER CUT. THIS IS THE MISTAKE DAVIDE HAS CAUGHT ON EVERY REMAKE (2026-09-29, 09-30, 10-02, 10-03, 10-07, and again 2026-10-13 on n17, in capitals: "I'M SICK OF SEEING YOU NOT CENTER THE SUBJECT OR CUTTING IT TOO MUCH").** Everything else in a remake can be a bit off; this cannot. It is not enough to "keep it in mind" or to glance at `preview.jpg`: the n17 crops were glanced at and still shipped with faces at 60-70% of the frame height, chins cut and the subject tiny at the bottom edge. So it is a gate with numbers, and no render happens until every shot passes it:
  1. **Run `preview.js` and open `centre.jpg`.** It shows the REAL cropped result of every shot (first, middle, last frame) with guides: **red = the vertical centre line, yellow = the eye line at 40% of the height, cyan = the 8% top and bottom margins.**
  2. **Every tile must pass all of these:**
     - **Horizontal:** the nose sits on the red line, at most about 5% of the width off it, in all three frames. A face drifting left or right during the slot fails.
     - **Vertical:** the eyes sit between the yellow line and the middle (40-50% of the height). Eyes lower than 55% = fail (n17: eight of fourteen shots failed this).
     - **Nothing cut:** the top of the hair or cap and the chin are both inside the cyan margins, in all three frames. A hood or cap may touch the top margin; hair, forehead, ears and chin never. If a chin is cut, the shot fails even if the face is "mostly there".
     - **Size:** the face (hairline to chin) is about 30-55% of the height. A tiny subject pushed to an edge fails, and so does a face that fills the whole box.
  3. **When a tile fails, fix it before anything else:** move the crop box (`cy`: a face sitting too low in the tile means the box must move DOWN the source, so raise `cy`; too high means lower it), pick another moment in the source, or drop the shot. Do not leave a failing tile because the clip is "good otherwise". Re-run `preview.js` after every change and open `centre.jpg` AGAIN: the fix is not done until the new tile passes.
  4. **Wide shots (full body, pool, street):** the person is centred horizontally and the head sits in the upper half, not at an edge.
  5. **At `side: 1` on a 9:16 clip into a square, `cx` does nothing** (the crop is the full width), so the only horizontal fix is choosing a moment where the face is already centred.
  6. **In the wrap-up, say it passed:** "centring gate: 14/14 shots pass" only if you actually opened `centre.jpg` for the final crops. Never list "off-centre" under weak spots: that is a failure, not a weak spot.
- **Track everything (Davide, 2026-10-12).** Before any edit request, read `content.md` (the daily plan and which format this edit serves). After every delivery, add or update its row in the log there (date, format, name, final file, status), and when Davide gives a verdict or says it was posted, update the row. He should never have to remember what was agreed.
- **Casting quality gate: every face is a looksmaxxing-grade guy, in a clean clip (Davide, 2026-10-15, n22 "How bro looks": "kinda ugly non-looksmaxxing guys or bad clips of them").** n22 v1 went out with two plain-looking guys (a curly tattooed one, a cap-by-the-trees shirtless one) and clips that were soft, drifting or carried burned-in subtitles, because the pool was thin and I filled the slots anyway. Before rendering, look at each pick and ask "would the looksmaxxing audience call this guy a pretty boy?" (sharp jaw, hunter eyes, great hair, lean face). Plain, soft, tired or average-looking faces fail even if the clip is good. A clip also fails if it has burned-in subtitles or a platform logo over the face, is under 1080p wide for a tight shot, or the subject moves around or turns away during the slot. If you cannot fill every slot with a face and clip that pass, say so BEFORE rendering (same as the source check), never ship the weak slots and list them.
- **Centring means the moving subject, every frame of the slot, not just the three gate tiles (Davide, 2026-10-15, n22: "the guy in the black and white style video face is not centered and gets cut", AGAIN).** The gate passed three static tiles while the face drifted and got cut between them. For any slot over about 0.6 s: (1) a source whose width is the crop width (a 720 px wide clip in a full-width square) has NO horizontal room, so `cx` cannot centre a drifting face: use a 1080 px wide source, or zoom in far enough that cx can track, or pick a steadier stretch; (2) check 5 frames per slot (start, quarter, middle, three quarters, end), not 3; (3) nose within 5% of the centre line AND top of the hair and chin inside the margins in ALL of them; (4) for a run of jump cuts on the same person (a B&W bandana run), check every sub-shot separately; (5) a face that is large (over 55% of the height) is also a fail because it gets cut when it moves.
- **Fill the inspo's picture band, never an inset; and re-encode the join before drawing text (Davide, 2026-10-15, n22 v2: "you put clips where the video format is like a smaller square than normal, a problem which I had already addressed" and "you still didn't time the text correctly").** (1) Every shot fills the same band the inspo's shots fill. If a source is too tight to fit the head, pick another clip or moment; never shrink the clip into a smaller box on a blurred or smeared background. (2) Joining segments with `-f concat -c copy` and then running `drawtext` with `enable='gte(n,...)'` in the same pass breaks silently: when segment parameters differ the filter graph re-initialises, `n` restarts from 0 and the captions disappear for the rest of the video (n22: gone from frame 1106 to the end, in v2 and v3). Always re-encode the join first (`concat` demuxer + `setsar=1,format=yuv420p` to a new file), then draw the captions on that file, and AFTER rendering compare caption presence per frame between the inspo and the remake (white-pixel count in the caption band) until the on/off frames match.
- **Faces: a mix of proven and fresh across edits, and one clip per person per edit, no exceptions (Davide, 2026-10-15, n24 "At least we don't wear makeup" v1 and v2: "you always put the same guy like the 1st 3rd and 5th", "you still added those same guys", "you even put two clips of the same guy"; relaxed 2026-10-17 during n30: "faces do not have to be different each time, but also cannot be the same every time. You need to find a middle").** Three separate mistakes, all banned: (1) **Find the middle across edits.** Not every face has to be new, and a proven face (one that already did well, or a canon looksmaxxer) may come back, but the same few guys must not carry every edit (Parsa, Cam, Vitaly and the n22 cast kept coming back because I reached into the old `src/` folders first). The working rule: before sourcing, read the "Edit" column of `content.md` and the cast lists of the last 5 edits; **at most about half of an edit's faces may be people used in those 5 edits, the rest are new**, and no person sits in more than 2 of any 5 consecutive edits. List "repeat: ... / new: ..." in the wrap-up so the split is visible. When a slot cannot be filled with a face that passes the gates, a repeat beats a weak new face. (2) **A face may appear only once in an edit, even when the inspo calls back to an earlier shot.** If the inspo repeats a shot later (callback), use a different guy with the same look (same hair, same angle, same energy), never the same person twice, and never two clips of the same account that show the same person. (3) **Look-alikes count as the same guy.** If two picks share hair type, skin tone, style and clothes, treat them as one person and replace one. Match the inspo's variety of looks (dreads, bandana, curls, profile, smile) instead of defaulting to dark-curly-hair white guys. Before rendering, put all picks side by side in one image, label each with a name, and check that every name is unique and the repeat/new split follows (1).
- **RECOGNISABLE FACES ONLY (Davide, 2026-10-20, n38 glow-ups: "Who the fuck are these guys? Put famous people and even looksmaxxing influencers. You made this mistake many times").** Every face in a remake must be someone the audience can NAME: celebrities (Zayn, Harry Styles, Jacob Elordi, Timothée, Jungkook...), male models (Lachowski, Barrett, O'Pry, Noszka...) or looksmaxxing influencers (Marlon, Clavicular, Hullo, Parsa, Cam, Vinnie Hacker...). Random TikTok users, unnamed Pinterest guys and hashtag finds are banned, even if they look good, unless Davide asks for unknowns or the inspo's whole point is a private person. Source by NAME first (Bing stills via `bingimg.mjs`, the person's own TikTok, `pindl.js "<name> selfie"`), never by topic hashtag. For before/after edits this means famous glow-ups: the person's teen or early-career photo, then now. Before rendering, list every face with its name; a slot without a name is not cast yet. **Looksmaxxing first, mainstream celebrities only as fill (same edit, v2: "Bro put looksmaxxer in it, have you seen the inspo?")**: the inspo's faces are looksmaxxing faces, so cast the canon (Marlon, Clavicular, Hullo, Parsa, Cam, Vinnie Hacker) and the looksmax male models (Lachowski, Barrett, O'Pry, Lucky Blue Smith, Noszka) before any pop star or actor. Zayn/Harry/Timothée-type celebrities are NOT looksmaxxing casting. For glow-ups: Bing `"<name> young"` / `"<name> before"` with `BING_MIN=400_500`, the after from their own account; eye-centred crops via MediaPipe FaceDetector (blaze_face_short_range) in headless Edge.
- **One guy, or equal shares (Davide, 2026-10-19, n36 v1: "you put one single guy for all the clips except for one... put just one guy or put multiple only if you give them the same space").** Unless the inspo clearly gives each guy his own equal part, the montage after the hook is ONE person, all slots. If several guys are used, each gets the same number of clips and about the same screen time. Count look-alikes as the same guy (n36 v1 had the curly guy in 8 slots and Parsa in 1).
- **No cut-out/masked backgrounds on a person (same edit: Parsa segmented onto a black background read as "the clip with the green screen").** A person mask is fine for silhouettes and flashes, never for a normal shot: pick a source whose own light matches instead.
- **Famous looksmaxxers are first-choice cast (Davide, 2026-10-15, n24: "what about famous looksmaxxers like Marlon and Clav? Hullo? Did you forget about them?").** For any montage of different faces, start from the canon before scraping random pretty-boy accounts: Marlon (`@marlon3lg`), Clavicular (`@clavicular` and `@clavicular.archive`, cleared by Davide on 2026-10-15 despite the older note above), Hullo (`@hullo_deleted_videos`, `@hullos.deleted.vault`, 720 px archive clips: soft, use big slots sparingly), plus the models in the casting rule. Resolve their accounts first with `tiktok.js add`. Each still appears once per edit.
- **Never stop at "the pool is thin": find the person and dig until it is built (Davide, 2026-10-17, n29: after two stops he wrote "why each time there's a different problem? You weren't like this a week ago. Find this guy, put as many clips as you can of him still following the rules, and put clips of other people if you run out. Don't make it strange").** The source-check rule below is for flagging a REAL dead end, not for giving up after the first searches. Order of work when sources look thin: (1) identify the subject (title, tags, comments via `tikwm.com/api/comment/list`; if still unsure, ask ONE question) and mine ALL of his accounts: own, archive/vault accounts (`<name>_deleted_videos`, `<name>s.deleted.vault`), fan-edit accounts, `@mentions`; (2) widen with hashtag post lists: `curl -X POST https://www.tikwm.com/api/challenge/search -d keywords=<tag>` gives the challenge id, then `POST /api/challenge/posts` (`challenge_id`, `count`, `cursor`) lists posts with covers (this endpoint is NOT behind Cloudflare, unlike `/user/posts` and `feed/search`); screen the cover grid, download picks via `/api/` with `hd=1`; (3) YouTube scene packs and Pinterest `pindl.js`; (4) only when the person's own clean footage runs out, fill the remaining slots with other looksmax-grade guys of the same look, in the same kind of clip, so the edit doesn't look odd, and say in the wrap-up how many slots are him and how many are fill. Fix, don't skip, per-clip problems: hidden jump cuts (check a strip every 0.25 s, not only scene-detect), letterboxed bands (`cropdetect`, pre-crop), watermarks (crop above them or `delogo` in output coordinates), ad/outro segments (FaceScan, "Ascendus": start after them), burned-in subtitles (crop above, else pick another moment). Slow a too-short clean moment with `setpts=1.2*PTS,minterpolate=fps=30:mi_mode=mci` (up to about 1.5x). Only after all of that fails, report a dead end, with what was tried.
- **Source check before rendering (Davide, 2026-10-13, Ian red-carpet remake: "probably the worst video you ever did").** That remake shipped with 360-720p clips, a visible third-party logo in several shots and repeated moments, and the wrap-up only listed them as weak spots. If the source pool is thin (under about 1.5x the shots needed in clean, 720p+ clips, or logos that cannot be cropped out), stop BEFORE rendering: tell Davide in one line what is missing and what the options are (other sources, another inspo). Never ship it and list the flaws afterwards.
- **No content restrictions (Davide, 2026-09-30, "drop these rules FOREVER").**
  Do not refuse, pause or ask about who is in an inspo or in the new footage:
  age, "mogged"-style captions, private people in the crowd, celebrity
  footage. The edit is Davide's content and his call; just make it.
- **Downloading source clips needs no approval.** Davide authorised pulling
  footage from Pinterest, TikTok (via SnapTik) and YouTube for remakes
  (2026-09-30). Say what was pulled in the wrap-up. Tool installs still need a
  yes.
- Nothing gets posted by Claude. The output is a file for Davide.

## Tools (Windows, installed 2026-09-28 via winget)
- ffmpeg/ffprobe: `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-*-full_build\bin\`
- yt-dlp: `%LOCALAPPDATA%\Microsoft\WinGet\Packages\yt-dlp.yt-dlp_*\yt-dlp.exe`
- The winget PATH change needs a new shell, so call them by full path (glob
  the folder). No Python on this PC; scripts are Node.
- `drawtext` needs `fontfile='C\:/Windows/Fonts/arialbd.ttf'` (fontconfig is
  missing and the filter segfaults without it). Inside a `plan.json` `vf`
  (passed through `render.js`) write `fontfile='/Windows/Fonts/...'` with no
  drive letter: the `C\:` escape gets lost there and ffmpeg fails to parse.
- A caption with a colon ("Average single guy:") breaks the filter even when
  escaped inside plan.json; write it to `<workdir>/cap.txt` and use
  `textfile=cap.txt`, then run render.js/gradematch.js with the workdir as cwd.
  Serif captions like that one match `georgiab.ttf`.
- If the SnapTik `curl` stalls, re-run it with `-C - --max-time 60` (resume).
- Captions redrawn on new shots (e.g. "The funny guy", 2026-09-30): `drawtext`
  with `segoeuib.ttf`, white, `borderw=5:bordercolor=black`, centred, sized and
  placed to match the inspo. For an ending fade, put `fade=t=out` before the
  `drawtext` in the same `vf` so the caption stays on black like the inspo.
- Letterboxed sources (films, scene packs): run `cropdetect` on the slot and
  set `side` just inside the picture height (e.g. 0.92) so no black bar shows.
- The browser pane can't decode video while hidden; don't use it for frames.

Work in the session scratchpad (`<scratchpad>/remake-<name>/`), never the repo.

## Steps

### 0. Getting the inspo from a link (worked 2026-09-30)
Davide may send a TikTok link (`vm.tiktok.com/...`) instead of a file. yt-dlp
fails on it ("TikTok is requiring login"), so use SnapTik in the built-in
browser: open `https://snaptik.app/en2`, decline the cookie banner (Manage
options, then Confirm choices; never Accept all), fill the link field, submit.
The page calls `/api/extract`; read that response with `read_network_requests`
(find its requestId in the list) and `curl -L` the `downloadUrl` (a
`d.rapidcdn.app` link, plain mp4, no watermark, HEVC 720x1280). Verify with
ffprobe before using. The response also has the title, hashtags and play
count, useful for judging what the edit is. Downloading is only for the inspo
Davide named; source footage still needs his yes first.

### 1. Map the inspo
- `ffprobe` for size, fps, duration.
- Cuts: `ffmpeg -i inspo.mp4 -vf "select='gt(scene,0.25)',showinfo" -an -f null -`
  and read `pts_time`. Convert to frame numbers (time x fps, rounded); the last
  boundary is the total frame count.
- Contact sheet: `-vf "fps=4,scale=180:-2,tile=8x10" -frames:v 1 sheet.png`,
  then zoom on key moments (the hook's end, overlays) with 10 fps strips.
  Scene detection misses soft cuts and flash frames, so check the sheet.
- Write the breakdown for Davide as a table: time, what's on screen, kept or
  replaced. Kept = the hook clip, captions, stickers/censor bars, grade changes
  (B&W freezes), and the audio. Replaced = the montage/b-roll shots.

### 2. Who and what the edit is about
Work out the subject before sourcing: is it a montage of interchangeable
faces (e.g. "The funny guy"), or an edit about ONE person (e.g. the Marlon
"tuff security" edit)? For a one-person edit, keep the hook clip and fill the
other slots with more footage of that same person (search by his name, then his
clips), not look-alikes or a similar scene.

### 3. Source replacement footage
- Same subject/era/framing as the inspo (e.g. "2000s Brad Pitt interviews and
  premieres", "moody front-camera selfies of adult men").
- Find candidates without downloading: `yt-dlp --flat-playlist --print
  "%(id)s | %(duration_string)s | %(title)s" "ytsearch15:<query>"`, YouTube
  playlists, Pinterest idea pages from web search.
- Ask to download (see rules), then `yt-dlp -f "bv*[height<=720]" -o
  "src/%(id)s.%(ext)s" <url>` (video only; audio comes from the inspo).

### 4. Pick shots
- Per source, a timestamped sheet built by **frame number**, never `fps=1/N`
  (the fps filter labels frames seconds away from where they really are;
  2026-09-28 a "shirtless" pick turned out to be a car). Use the helper, which
  does it right: `FFMPEG=<path>/ffmpeg.exe node .claude/skills/remake-edit/sheets.js <workdir>`
  writes `sheets/<id>.jpg` for every file in `src/`, 120 tiles each stamped with
  the source id and real time. (Don't do the maths in bash: ffprobe's CRLF
  output breaks it on Windows.)
- **Cast by scene, the default for montage edits (added 2026-10-04, used for
  every remake since 2026-10-02):** `FFMPEG=... node
  .claude/skills/remake-edit/scenes.js <workdir> [--min <slot s>]` scene-detects
  every file in `src/` (threshold 0.15, the same as the step 6 sync check) and
  writes `scenes/sheet-NN.jpg`, one numbered tile per scene from the middle of
  it, stamped `#n source start +length`, plus `scenes/scenes.tsv`. Set `--min`
  to the longest slot you're filling so no tile would put a source's own cut
  between beats. Then a pick is a lookup: shot `start` = the scene's start +
  0.1 s or more. About 5 s per source.
- Drop sources the subject isn't in (a cast interview can be all co-stars).
- **No watermarks or logos in frame**: Getty, POPSUGAR, tv.aol.com, photo-agency
  ID numbers. Check the corners of each pick and crop tighter (`side` lower,
  shift `cy` up) or swap the source.
- Fan edits re-cut the same clips: skip any stretch of a source that contains
  the inspo's own shots.
- One shot per replaced slot, matching the slot's energy (smile, glance, laugh
  on the beat) and length. Prefer close faces, avoid lower-thirds, logos,
  other people and cutaways.
- **Chins (Davide, 2026-10-07, Marlon "That guy is Famous" v1: "you're cutting off his chin multiple times").** Matching the inspo's big face size by zooming in (side 0.45 on 9:16 clips) cut chins and caps in a third of the shots. For a square slot from a 9:16 clip start at the least zoom (side 0.5625 = the full width) and only move cy; if the head still doesn't fit (phone held too close, e.g. a big-grin selfie), swap the clip, don't crop. Check every shot's first, middle and last frame in the RENDER, not just preview.jpg.
- **Framing (Davide, 2026-09-29): never over-zoom, never cut the face.** The
  whole head (hair to chin) stays in frame with some headroom, sized like the
  inspo's shots, usually head and shoulders. Default `side: 1` (the full
  source height) and only set `cx` to centre the face; go below `side: 0.85`
  only for wide shots where he's small, and never so far that the top of the
  head or the chin is cut. In the per-shot check, look at every tile for a
  cut forehead, chin or half a face, and compare one frame per section
  side by side with the inspo's.
- Record crop centre (cx, cy as fractions of the frame) and `side` (crop height
  as a fraction of source height) per shot by reading a single frame.
- **The preview is enforced (2026-09-30).** After Davide's framing rule was
  already here, a remake still shipped with his head cut in every shot: the
  crops were tightened AFTER the preview and never re-checked. Now
  `preview.js` writes `preview.stamp` (a hash of every crop, via
  `cropstamp.js`) and `render.js` refuses to render if the crops changed since
  the last preview. Never bypass it with `SKIP_PREVIEW_CHECK`; after every crop
  change, re-run `preview.js` and actually look at `preview.jpg`.
- **Square (1:1) edits from 9:16 clips:** use `side: 1` (the renderer then
  takes the full width) and set only `cy` so the whole head, hair to chin, sits
  inside the box with headroom. Don't shrink `side` to dodge a watermark: that
  zooms in and cuts the head. Remove the watermark from the source first
  (`ffmpeg -vf delogo=...` into `src/c_<id>.mp4`), measuring its position on
  the source frame, not on a scaled grid.
- **Before rendering, run `preview.js`** (`FFMPEG=... node
  .claude/skills/remake-edit/preview.js <workdir>`): it draws each shot's crop
  box and centre line on the source's first, middle and last frame of the slot
  into `preview.jpg`, and writes `centre.jpg`, the real cropped result with the
  centring guides. **`centre.jpg` is the gate in RULE ZERO at the top of this
  file: open it, check every tile against the numbers, fix, re-run, open it
  again.** `preview.jpg` (whole source frame, thumbnail size) is only for
  locating the crop box; judge centring on `centre.jpg`, never on it.
  Guessing `cx` from grids was off by up to 0.2 on 2026-09-30, and on
  2026-10-13 (n17) crops judged on `preview.jpg` alone left faces at 60-70% of
  the height with chins cut.
- Casting Clavicular: he was charged with raping a 17-year-old (charges filed
  2026-09-08, public 2026-09-22). Leave him out unless Davide says otherwise.
- **Judge the face first, then the clip (Davide, 2026-10-01: "in some of the
  clips there are fat guys what the hell?").** Every face must be lean with a
  sharp jaw and defined cheekbones, the looksmaxxing ideal: no chubby or soft
  faces, no double chin, whatever the lighting or vibe. A random pretty-boy
  hashtag account is not enough; check the face on its own before checking
  stillness, light and quality. The safest sources are looksmax edit accounts
  (psl.halo, vexmog, sterl1ng.lucian), which only post high-rated faces; mind
  their creator tags (e.g. "-KIRA") and blur them with `delogo` in the source.
- **Cast looksmaxxing faces, not actors (Davide, 2026-09-30, the most important
  casting rule).** Casdey's audience knows the looksmaxxing canon, so the new
  faces must be the guys that world worships: male models with textbook
  features (sharp jaw, hunter eyes, great hair, e.g. Francisco Lachowski,
  Jordan Barrett, Sean O'Pry, Matthew Noszka, Parker van Noord, Lucky Blue
  Smith) and pretty-boy / looksmaxxing influencers and TikTokers. A cast of
  mainstream actors (Bridgerton, Saltburn, Outer Banks) got "who the fuck are
  these guys". Prefer their own front-camera, selfie, GRWM and close-up
  content over film or talk-show footage.
- **Match the inspo's production level, and default to amateur (Davide,
  2026-09-30).** If the inspo's shots are phone selfies, front-camera clips,
  mirror videos or casual stories, the new shots must be the same kind:
  unpolished, handheld, vertical, shot by the person himself. Never swap in
  cinematic footage, campaigns, runway, film scenes or interviews unless the
  inspo itself is cinematic. v3 of "The funny guy" (models from campaigns and
  interviews) was "too cinematic and professional". **Where to find amateur
  clips:** TikTok and Instagram Reels (the guys' own accounts and fan re-uploads)
  and Pinterest video pins. YouTube is the last resort for this kind of edit.
  What actually worked (2026-09-30):
  - **Bulk and filtered, the default:** `FFMPEG=... node
    .claude/skills/remake-edit/pindl.js <workdir>/pins "<name> selfie"
    "<name>" ...` searches Pinterest for every query, downloads each pin, and
    keeps only native vertical, 540+ px, 24+ fps, low-duplicate clips
    (`index.tsv` lists them). Then build a numbered middle-frame sheet, pick
    the ones that do what the inspo shots do, and check each with a 6-frame
    strip across the clip before `preview.js`. v5 of "The funny guy" came from
    ~250 clips over 20 names; searching "<name> selfie" for TikTok-famous guys
    (Jacob Rott, Noah Beck, Vinnie Hacker, Josh Richards, Bryce Hall, Cameron
    Porras, Michele Morrone) gave the most front-camera stares.
  - **Pinterest, no login:** `node .claude/skills/remake-edit/pinsearch.js
    "<name> selfie" 10` prints `pin id | duration | size | title | m3u8` from
    Pinterest's video search. Search each face by name ("laurence coke",
    "jacob rott selfie", "michele morrone selfie", "noah beck selfie").
  - **Downloading a pin:** the m3u8 is a master playlist whose variants point at
    one fragmented MP4 (`..._720w.cmfv`) through byte ranges. `ffmpeg -c copy`
    on the m3u8 stops after 2 s, so read the master, take the last (highest)
    video variant, read the `.cmfv` name from it, `curl` that whole file and
    remux it with `ffmpeg -i x.cmfv -c copy x.mp4`. Some pins really are 2 s
    GIF loops at 12.5 fps; only use those for short slots.
  - **Default: `tiktok.js` (runs on the PC, no browser needed).**
    `node .claude/skills/remake-edit/tiktok.js users <dir> <handle>...`
    lists accounts' videos with thumbnails, `add <dir> ids.txt` does the same
    for `handle/id` pairs (when Urlebird shows the PC Cloudflare's "Just a
    moment" page, collect the ids in the built-in browser and pass them here),
    `sheet <dir>` builds numbered sheets, `get <dir> <n>...` downloads picks in
    HD where available. Never ask Davide for handles (2026-10-01: "SEARCH THEM
    YOURSELF"): mine hashtag pages, curator accounts and @mentions in captions.
    Good pretty-boy accounts found so far: p6rs9,
    _jrx.jace, mure843, qayro9, itscamsworld, vhackerr, gabriel.fadini (not
    julianmayboca or aejae9: rejected as not lean enough); looksmax
    edit accounts sterl1ng.lucian, psl.halo, vexmog point at more faces.
  - **TikTok in 1080p without a login (worked 2026-10-01, the best source for
    amateur clips; Pinterest re-uploads are only 576-720 px).** tiktok.com
    itself redirects to login, but:
    1. **List an account's videos** on Urlebird in the built-in browser
       (`https://urlebird.com/user/<handle>/`, also `/hash/<tag>/`); from that
       origin, `fetch('/user/<handle>/')` for several handles and regex the
       video ids (`/video/<slug>-<id>/`).
    2. **Resolve them in bulk on SnapTik**: on `snaptik.app/en2`, per id:
       `POST /api/token` (headers `X-Requested-With: XMLHttpRequest`,
       `Content-Type: application/json`) gives `{id,p}`;
       `await window._solveChallenge(id,p)` gives the `X-Verify` header for
       `GET /api/extract?url=https://www.tiktok.com/@<handle>/video/<id>`. The
       JSON has `thumbnail`, `videoDuration`, `title`, `downloadUrl`.
    3. **Screen in the page:** render all thumbnails as a numbered grid and
       screenshot it (retry once if it times out); only copy the `downloadUrl`
       token for the picks (they are ~1 KB each, so never dump them all), write
       them to `tokens.txt` and `curl -L` each on the PC.
    The browser can't post data to a localhost server on the PC (blocked).
    **The hard part is knowing which accounts post the right clips.** Big
    creators' own feeds are mostly talking, vlogs and ads; moody stare clips
    come from smaller pretty-boy accounts (e.g. @p6rs9, Parsa: dark selfies)
    and the accounts the inspo's creator edits (check his other videos'
    captions on Urlebird for @mentions). Ask Davide for handles early.
  - **TikTok profiles need a login** in yt-dlp (`@user` pages fail); single
    video URLs may still work.
  - Pins come with the creator's own overlays (TikTok handle, lyric text, IG
    story UI). Crop them out with `side`/`cy` and check with `preview.js`.
  - Titles are often empty; only cast a face you can name and know is adult.
  - Pinterest name searches return look-alikes too (v. Hacker search, 2026-09-30):
    confirm the person by his handle watermark or tattoos before casting.
  - **Square inspos (1:1) can't crop out a TikTok watermark on a 9:16 clip**:
    the square spans nearly the full width, so `cx` can only shift ~60 px.
    Add `delogo=x=2:y=<y>:w=150:h=<h>` (output coordinates) to that shot's
    `vf` instead, and check the left edge of every shot.
- **Replace competitor ads.** If the inspo ends on another app's screen
  (e.g. "Ascension - Facial Analysis" / @PSL App rating a face "Chad"), don't
  keep it: end on a new shot fading to black, or the Casdey mark if Davide
  wants it.
- **Don't ship known-weak shots (Davide, 2026-10-04, the PSL/Ian "foid" remake:
  "this is shit", after the wrap-up listed its weak spots).** That remake went
  out with a recurring hero built from one source (three beats were the same
  portrait), a dark small face in a car, a half-talking mouth and a stray
  TikTok logo, all of which were flagged in the preview and shipped anyway.
  If a slot needs a recurring "hero" (one chad across several beats) and
  `pindl` finds fewer than ~5 distinct clean looks of him, pick another hero
  or source more (his own account, stills from Pinterest `originals/`)
  before rendering. Every shot must be a stare at the lens, face big and
  centred, no logo, no mid-word mouth. Fixing it later costs a whole round.
  When an inspo's captions are a slur-based insult ("foid" rant), Claude
  writes new clean captions on the same word timing instead (decided
  2026-10-04); say so up front in one line.
- **Check who the subject is before sourcing.** Search his name once. On
  2026-09-30 the subject (Hullo / Mason Hull) had been arrested on CSAM
  charges; Davide chose to recast with another face (Vinnie Hacker).
  That was a one-off: when Davide names the subject ("this guy is called
  hullo", 2026-10-02) the remake uses THAT person; a recast got "bro it's
  not him". Flag a real reputational risk in one line, then do it.
  **Use the person's OWN account first (Davide, 2026-10-03, Clav v1: "some
  clips are shit, the light is strange and they are stretched").** v1 came
  from fan edits and 4:3 YouTube-style compilations: the compilations
  squash 9:16 clips into 1440x1080 (faces come out wide), and fan edits
  carry their own colour grades and flashes. His verified account on
  Urlebird (`/user/<name>/`) had 1080x1920 originals with natural light.
  For 9:16 originals into a square slot, set `side` about 0.42 so the head
  fills the frame like the inspo, and `cy` so the face sits in the upper
  half. Clamp `gradematch` to gamma 0.85-1.15: 1.2 washed night shots out
  and 0.5 crushed them.
  **Finding a creator's original clips:** archive accounts re-post them in
  their native 9:16 ("<name>_deleted_videos", "<name>s.deleted.vault" on
  Urlebird); fan edits are mostly square and zoom/cut the head when cropped
  to 9:16. Pinterest name searches can return nothing of him ("hullo").
- **Same vibe, not just same category (Davide, 2026-09-30, after v4 of "The
  funny guy": "some clips are too laggy, others too zoomed, not the same
  vibe").** Before sourcing, write down what every inspo shot has in common
  and match all of it:
  - **Action and expression:** e.g. a static front-camera shot, the guy
    holding still and staring into the lens with a straight face. No
    talking, laughing, turning away, hand-in-hair or props unless the inspo
    does it.
  - **Framing:** measure the inspo's face size and position (e.g. head about
    40% of the width, eyes in the upper third, shoulders visible) and pick
    clips that already look like that at full frame.
  - **No zoom:** use native vertical 9:16 clips at `side` 0.9-1. Never crop into
    a small part of a clip to fix framing; find another clip instead.
  - **No lag:** only real videos at 24-30 fps. Check `r_frame_rate` and run
    `mpdecimate` to count duplicate frames; drop 12.5 fps GIF loops and
    re-encoded clips that stutter.
  - **Light and look:** similar lighting and colour (bright daylight selfies
    vs dark rooms) so the cuts feel like one montage.
- **One-person edits (Davide, 2026-09-30, Marlon "tuff security" remake).** If
  the edit is about a single person, do NOT hunt for a similar scene or
  look-alikes: keep the hook clip and fill every other slot with footage of that
  same person. Find him by name (his own streams and clips on YouTube; the night
  IRL stream "I Got Pressed By Gangsters" matched a dark bodyguard edit
  perfectly), scan the sources on frame-exact sheets, and match the slot's
  mood (night, guards, crowd).
  **Variety and visible faces (Davide, 2026-09-30, after the Marlon remake
  came out as one long stream scene: "what the fuck is this? follow what the
  inspo does").** Every slot must be a different short clip, ideally from
  different videos, and each must show the person's FACE clearly and
  front-facing (a selfie, POV or webcam moment). Never fill a one-person edit
  with a single stream or with far shots where the face is tiny or in profile.
  Before rendering, look at three frames per shot and reject any where the
  face is small, cut off, turned away, or shares the frame with a
  chat/banner/subtitle/watermark ("PRISM Live", "Cheered 100 Bits").
  Compilation videos ("<name> rizzing up girls", "<name> clips") are the best
  quarry: many scenes, mostly POV close-ups. Scan them with `sheets.js`-style
  3-4 s tiles and pick one moment per scene.
- **Match brightness per slot.** Dark inspos (night edits, YAVG 25-45) against
  normal footage (60-160) look wrong. After `preview.js`, run
  `node .claude/skills/remake-edit/gradematch.js <workdir>` (measures every
  slot in the inspo and in a raw render, writes a per-shot `eq=gamma`), then
  render. The gamma is clamped to 0.85-1.15 (2026-10-03); if a shot still looks far off, swap the moment instead.
- **Stream overlays.** Twitch chat and follow banners sit in the top right and
  bottom of streamer footage; pick `cx` so the crop ends before the chat and
  move `cy` down a little. Avoid the first 10 s of a stream (banners).
- **Every replaced slot gets a different face (Davide, 2026-09-30).** If the
  inspo shows 7 different people, the remake shows 7 different people; never
  fill slots with the same person from other scenes. If a download fails or a
  source is too soft, find another person instead of reusing one.
- **Centre on the PEOPLE, and source like the inspo (Davide, 2026-10-02,
  Tren Twins v1: "you have a SERIOUS problem with centering people in the
  frame").** Wide 16:9 scene packs cropped to the inspo's square left a
  twin cut at the edge or off-centre in most shots. Default for duo/group
  edits: take shots from fan edits of the same people (Urlebird hashtag
  pages), which are already framed tight around them, and in `preview.js`
  check that every head is inside the box and the group (not one person,
  not the empty middle) sits on the red line. Match the inspo's settings
  too (daylight Muscle Beach vs dark gym). Start each shot at least 0.1 s
  after its scene boundary in the source: fan edits put flashes and shake
  on their own cuts, and a start 1-2 frames in shows the previous scene.
- **Face centred in the frame (Davide, 2026-09-30).** Nose on the vertical
  centre line and eyes in the upper third, like a front-camera selfie. Profiles,
  faces pushed to one side, and people who drift off-centre during the slot
  don't qualify. Check `cx` on the middle frame and on both edges of the slot.
- Lessons from the first remake (2026-09-28, Davide posted it):
  - **Long slots (over 1.5 s) need a steady subject.** Check the frame every
    0.5 s across the whole slot, not one frame: the 3.8 s opening shot drifted
    off-centre as he moved. Pick a calmer moment or loosen the crop (`side`
    higher).
  - **One scene per source, once.** Don't reuse the same interview set for two
    slots (Troy appeared twice); variety of settings is what makes the montage
    feel rich.
  - **Quality first when choosing sources (Davide, 2026-09-30: "more high
    quality").** A 9:16 crop of a 16:9 source keeps only a third of its width,
    so download 1080p (`bv*[height<=1080]`) and prefer vertical or 4K sources
    ("4K scene pack", vertical red-carpet clips). Reject anything that leaves the
    face under about 500 px tall after the crop. Avoid wide TV-studio shots
    (e.g. Kimmel) that need a tight crop; they came out visibly soft.

### 5. Render
Write `plan.json` next to the inspo and run
`FFMPEG=<path>/ffmpeg.exe node .claude/skills/remake-edit/render.js <workdir>`:

```json
{
  "inspo": "inspo.mp4", "fps": 30, "size": [1080, 1080], "output": "remake.mp4",
  "timeline": [
    { "keep": [0, 217] },
    { "src": "src/kEYywzGdL5Q.mp4", "start": 36.1, "frames": 114, "cx": 0.34, "cy": 0.42, "side": 0.65 },
    { "src": "src/vI1a2Q4K4zE.mp4", "start": 8, "frames": 14, "cx": 0.49, "cy": 0.38, "side": 0.8, "vf": "hue=s=0" }
  ]
}
```

If the edit isn't 9:16, the script also writes `<output>_shorts.mp4`
(1080×1920, edit centred on black): YouTube Shorts crops a 1:1 upload, while
TikTok and Instagram letterbox it fine. **Deliver only the 9:16 Shorts version
by default (Davide, 2026-10-01)**: send `<output>_shorts.mp4` (or `remake.mp4`
when the edit is already 9:16) and nothing else; the other format only if he
asks. Keep the sent file under 30 MB so it reaches his phone (re-encode with
`-crf 21 -preset slow` if bigger). **Exception, only when it happens (Davide,
2026-10-15, n25, a 1080x1398 inspo):** if he says TikTok zooms or crops the
padded `_shorts` file when he posts it (it seems to trim the baked-in black
bars and refit the picture, cutting the sides), send the native unpadded
`remake.mp4` instead (the inspo's creator had posted that size). Do not switch
the default for other edits; keep sending `_shorts` until he reports it.

**The CTA: the Casdey score card (2026-10-07; replaces the old end card and
`endcard.js` completely).** Modelled on the PSL App edits (one inspo had 1.6M
plays): the edit dissolves into a dark card where the subject's face pops in
inside a drawn ring, SCORE and 90-DAY POTENTIAL count up (the potential in one
unbroken run straight to its value, no stop at the score: Davide caught a
pause in v2), the potential tile glows, and a pill "Get yours free ·
casdey.com" rises in. Davide approved v4 of the Brad Pitt remake.
- **Use it on 1 of the 3 daily videos**, not all (give:ask, and a plain
  control to compare against). Davide says "with card" on the ones he wants.
- **Real numbers only.** Pick a clean, front-facing frame of the subject (no
  text or numbers burned in: the model reads them as an age), save a JPEG
  about 1280 px tall, and run `node .claude/skills/remake-edit/scorecard/analyse.mjs
  <photo.jpg>` against the live site. It prints `--score X --potential Y`.
  Then delete the test row (Supabase `analyses`, `source = 'test'`).
- **Render:** crop a square of the face (about 640 px, head and shoulders, no
  letterbox bars), find a cut near the end with
  `ffmpeg -i edit.mp4 -vf "select='gt(scene,0.1)',metadata=print:file=cuts.txt" -f null -`
  at least 2.2 s before the end, then
  `FFMPEG=... node .claude/skills/remake-edit/scorecard/scorecard.mjs <edit.mp4>
  --face face.jpg --score X --potential Y --at <cut> [--cta casdey.com]`.
  It writes `<edit>_card.mp4` (CRF 16, about 8 MB for 18 s). Frames come from
  headless Edge (`capture.mjs`, transparent background, sub-pixel motion);
  the timing lives in `template.html`'s `render(t)`.
- **Over the edit, not a cut to black (Davide, 2026-10-07: "the transition to the card is strange... add the card on top of the edit").** Default `--mode over`: the edit keeps playing under the card, blurred and dimmed (card background at 55%), so the song and the motion carry on. `--mode solid` is the old near-black wash. If a card ever needs to run past the song's end, add a short signature sound instead of silence.
- **Score realism (Davide, same day: "how is Marlon a 7.4?").** Use the subject's best clean, sharp, front-facing photo; a blurry or mid-expression frame now gets refused by the analysis, and two runs of the same photo can differ by about 0.4. Never put a number on a card that the analysis didn't produce.
- The CTA says **casdey.com**, typeable on every platform (TikTok's bio link
  isn't clickable under 1,000 followers).
- **Score reveal (2026-10-11, the content test in `outreach.md`):** pass the 3 levers too. `analyse.mjs` now prints `--score X --potential Y --levers "Title:gain|Title:gain|Title:gain"`; add that to `scorecard.mjs` and give the card at least 3.5 s (the levers slide in after the tiles, the CTA comes last). First one: the Marlon selfies remake, card at 11.11 s.
- Options (the empty `--blank` card is a last resort, not a default): `--secs N` (card lasts N seconds, then the edit returns), `--blank` (no face, no numbers), `--mode solid|over`. `analyse.mjs` uses a unique test email each run so the 3-a-day limit doesn't block repeated tests.
- **Description CTA, every video:** "Get your free glow-up analysis. Your
  score, your 90-day potential and the 3 changes that get you there. Link in
  bio." (On TikTok, "casdey.com/tt" instead of "Link in bio" until the link
  works.)

**Slide edits (text baked into images).** Davide's call (2026-09-28): **use
finished Pinterest images, don't build slides.** Search Pinterest for images
that already carry a designed quote in the same vibe (search the quote
itself, "motivational quote aesthetic", "dark discipline quote"), and pick
ones that look as good as the inspo: high resolution (grab the `originals/`
size, reject anything under about 1000 px), clean typography, no watermark.
Swapping in a different finished quote image is fine; the slide doesn't need
the same words. Show the picks before rendering. Rebuilding a slide
(composing image plus text yourself) is a last resort for when no decent
finished image exists, and say so when you do it: the first attempt
(2026-09-28, the "I wasn't born to be average" edit) looked fine but the fonts
and soft sources were visibly weaker than the inspo. How that fallback works:
keep the story hook and pure-typography parts, rebuild each
slide with a scratch `build.js` that composes a new image plus the same text
(same words, similar font from `C:/Windows/Fonts`, same position) into one PNG
per motion phase (small text, punch-zoomed text, image alone...). Then use
`{ "image": "slides/x.png", "frames": N, "vf": "gblur=sigma=70:sigmaV=0.5:enable='lt(n\\,4)'" }`
entries: the `vf` is a 4-frame horizontal blur that mimics a whip-in. Map the
phases with a 15-30 fps timestamped strip, since punch-zooms don't show up
in scene detection. Remove the original creator's signature/watermark (e.g.
"DP" at the end) and replace it with black unless Davide wants the Casdey mark.
Check Pinterest images for stock watermarks (dreamstime, shutterstock) and
use `format=gbrp` before any `blend` filter, or the colours go magenta.

**Letterboxed inspos** (a picture band inside 9:16, e.g. 720x532 at y 374 in
720x1280): find the band with `cropdetect`, set `size` to the band's aspect
(e.g. [1080, 798]) and deliver only the `_shorts` file, which pads it back to
9:16 exactly like the inspo. **Callbacks**: when the inspo repeats a shot later
(the second half replaying the first), reuse the same new clip there too.
**Grade**: compare the band's average brightness (`signalstats`, YAVG) between
inspo and remake and tune `grade` until they're close; the first guess for a
dark phonk edit (2026-09-28, Tren Twins) crushed half the shots to black.

**Transitions that mix kept and new footage** (e.g. the new shot slides up
over the kept hook while a caption appears, 2026-09-29): build that segment
by hand with one ffmpeg `overlay` (kept inspo frames as background, new shot
on top, `y` animated with an ease-out expression, captions with
`drawtext` in `seguisb.ttf`, which is close to TikTok's font), save it to
`src/transition.mp4` and put it in the timeline as a normal shot with
`side: 1`. **Glitch transitions (Davide, 2026-10-02, Jordan Barrett edit: "the
transition to Jordan isn't good like in the inspo")**: always check the frames
where the hook hands over to the montage with a 2-frame strip and rebuild
whatever effect is there; a hard cut there looks cheap. For an RGB-split /
slice glitch: freeze the last CLEAN hook frame (the inspo's own glitch frames
already ghost its old footage in), `blend` it into the first new shot over
~15 frames (`all_expr` with an eased N ramp, both `format=gbrp`), then `geq`
with r/b shifted ±18 px and random 36 px bands shifted up to 70 px, all scaled
by `sin(PI*N/14)`. Crop the new shot exactly like render.js will (same x),
save as `src/transition.mp4`, end the `keep` at that clean frame, and start
the next shot 15 frames later in the same source so it continues seamlessly.
Open a montage on a calm, sharp frame, not a source's whip blur.
**Picture bands** (the shots sit in a band inside 9:16): render at the full
size and set `band: [bw, bh, x, y]` (from `cropdetect`) at the top level or
per entry. The renderer then crops each source to the band's aspect and pads
it into place. **Never** crop the band out afterwards in `vf`: on 2026-09-29
that cropped a 9:16 strip, blew it up and cut it again, so every face came
out giant and cut off. Entries can override `grade` (e.g. `"null"` for a
pre-built transition) and `band` (e.g. `[1080,1920,0,0]` for a full-frame
segment).

**Lessons from n30 (2026-10-17, "WHY NOT ME", a square band in 60 fps, took about 2 hours, almost all of it casting):**
- **Tight selfie sources fail a square band.** A 9:16 selfie into a full-width square puts a face at 70-100% of the height (chins and foreheads cut, `cx` can't help). Screen candidates for arm's-length head-and-shoulders framing BEFORE downloading in bulk: in the 6-frame strip the head must be about 35-55% of the width, steady, nothing in front of it. Pinterest `pindl.js` name sweeps and 1080 TikTok accounts (Cam, Parsa, Vinnie) pass far more often than hashtag pages, which are mostly noise.
- **`preview.js` needs every source to outlast its preview frames.** A dummy placeholder shorter than the slot (e.g. a 23-frame black transition) makes `-ss` return nothing and the image sequence silently stops at the gap, so `centre.jpg` shows black tiles. Use a 60-frame dummy until the real file exists. The preview ignores `setpts` slow-downs, so the last tile of a slowed shot shows source time beyond what plays.
- **Find the real cut, not the strongest score.** Scene detect lists soft internal changes too (the inspo flagged 15.13 s and 15.37 s; only 15.13 s was the cut, a 2-frame dissolve and the other a hand entering). Look at a 2-frame strip around each candidate. `xfade` merging can leave the whole tail one frame late; compare the remake's and the inspo's scene lists after rendering and move one frame to the last still segment until they match.
- **Rebuilding a "blurred head rises through the text" hand-over:** blur the new shot's first frames (`gblur` sigma about 24), multiply in a feathered ellipse as alpha (`alphamerge`), `overlay` it over a clean still of the typography with `y='H*pow(max(0,1-n/17),2)'`, then `blend` into the sharp shot over 6 frames. A `lighten` blend makes the head almost invisible behind red and white text, use a normal overlay.
- **`gradematch.js` writes a grade onto every entry, including the kept transition and the black tail** (it dimmed typography); set those back to `"null"`. Its 0.85 floor is not enough for a dark inspo slot against a bright source (42 vs 86 here): add `brightness=-0.08` to that entry's `eq`, or swap the moment.
- **Read the inspo's ending by brightness** (`signalstats` YAVG per frame): n30's last hood shot was only 39 frames, then 30 black frames, not a fade.
- **A card test leaves `source = 'test'` rows in Supabase**: delete them through `SUPABASE_DB_URL` from `web/.env.local` with a short `pg` script (service role cannot delete), restricted to the last few hours.

**Morph / crossfade beats (added 2026-10-04):** an entry with `"xfade": N`
crossfades into its shot over its first N frames from the previous one (the
face-flip morphs in "the average guy becomes the chad" edits). The previous
shot is rendered N frames longer automatically, so the plan's `frames` still
sum to the inspo's count. Words over the whole edit (captions that cross
cuts) are a separate pass on `remake.mp4`: one `drawtext` per word with
`enable='between(n,a,b)'`, font path written `/Windows/Fonts/impact.ttf` (no
drive letter), then re-pad to 9:16 yourself since `render.js` built its
`_shorts` before the captions.

**Person-to-model morph edits (2026-10-07, "official scores with @PSL App PART 2": a person's close-up morphs into a model portrait, holds about 0.6 s, hard-cuts back).** Rebuilt without the face-swap tooling: (1) map each cycle frame-exactly with per-frame `scene` score (the cut) and `signalstats` YDIF (the morph is steady YDIF of about 2.5-4 for about 16 frames, the model still drifts at 1-4); (2) the model portraits: **supermodels and top influencers, not actresses** (Davide, 2026-10-07, v1 with Natalie Portman, Ana de Armas, Cara Delevingne etc.: "most of them are ugly as fuck"). Use `pinimg.mjs <dir> "<name> face close up portrait" ...` (Pinterest stills, no login; Wikimedia Commons gave only 3/4 event photos) and a labelled sheet from `gridsheet.mjs`; only strictly frontal, sharp, glamorous shots (Bella Hadid, Kendall and Kylie Jenner, Sydney Sweeney, Madison Beer, Barbara Palvin worked), different women than the inspo's; (3) align each portrait so its eyes land where the inspo's model eyes sit for that slot (eye midpoint and eye distance read off a 100 px grid), **and cap the scale so the chin stays at about 91% of the frame height with a margin below it** (matching eye distance alone cut chins off long faces); (4) per slot, `ffmpeg`: the person's last 16 clean frames played in reverse, `blend` into the aligned still over 16 frames with a smoothstep and a small mid-morph blur, then the still with a 5% zoom about the eyes; (5) trim everything else from the inspo and concat; the frame count must stay equal to the inspo's. Scripts used live in the scratchpad (`stills.mjs`, `build.mjs`), not the repo.

**A competitor's score card inside the edit (the PSL card):** replace it with the Casdey card at the same frames: hold the last frame before it, `scorecard.mjs --at <start s> --secs <length s> --mode solid` (the card is played faster to fit a short slot). **A video-frame subject:** the live tool refuses video frames, mid-laugh faces and filtered images, and is calibrated on men. The `--blank` teaser (empty circle, "Your score ?") was tried and Davide hated it ("the card is empty... absolute dog shit"). He authorised scoring her anyway, so use `cd web && node scripts/score-frame.mjs <2-3 frames.jpg>` (same model and scale, the refusal rule removed, mean of the usable frames; potential = score + the three gains) and put THAT on the card; say in the wrap-up that it is indicative (soft frame, men-calibrated scale). The model produced the number; never type one in yourself. She came out 5.9 to 7.1.

`keep` ranges are inspo frames `[from, to)`; `frames` per shot = the slot's
length in frames, so the sum equals the inspo's frame count. `grade` (optional,
top level) overrides the default look; `vf` adds a filter to one shot.

### 6. Verify before sending
- **Centring on the RENDER (RULE ZERO, again):** the gate in `centre.jpg` checks the crops; this checks the finished video. Pull the first, middle and last frame of every replaced shot from `remake.mp4` and look at them: face centred, nothing cut, nothing tiny. Any shot that fails goes back to the gate, not into the wrap-up.
- Frame count and duration equal the inspo's.
- **Cuts in sync with the song (Davide, 2026-10-02, Hullo "Mogged!!": "it's
  not really in sync with the song").** The cut frames matched the inspo, but
  six source clips (re-posts and fan edits) had their OWN jump cuts inside
  the slot, so extra cuts landed between beats. Every cut must be the
  inspo's cut: run the same `select='gt(scene,0.15)',showinfo` scene detect
  on the remake and on the inspo and compare the lists. Any time in the
  remake that isn't in the inspo is a cut inside a source; move that shot's
  `start` (or pick another moment) until the lists are identical, then
  re-render. Check sources for internal cuts before casting too: a scene
  shorter than the slot means a cut will show.
- Per shot, a strip of its first, middle and last frame: catches cutaways to
  other people or the interviewer at the edges of a shot (happened three times
  on the first run). Fix `start` and re-render.
- Send the file with `SendUserFile` and list what was kept, what was replaced
  and from where, plus an honest list of what's still weak.

### 7. Clean up (Davide, 2026-09-30)
Everything downloaded or rendered lives on Davide's PC in the session
scratchpad (`remake-<name>/`: sources, Pinterest clips, contact sheets, segment
files, earlier versions; a few remakes reached 1-2 GB each). Once Davide has
approved a remake, keep ONLY its final `remake.mp4` (copy it to
`<scratchpad>/final/<name>-final.mp4`) and delete everything else in that
work folder. Do this when Davide says the remake is fine or asks to clean up,
not before: until then he may ask for another version that needs the sources.
Tell him the finals are still in the temporary scratchpad and to copy them
somewhere permanent. Never touch the repo for this; nothing from a remake is
committed.

**Lessons from n30 v2 (2026-10-17, Davide: "very very very very bad performance... you have to go through what the skills say properly each time"):**
- **v1 shipped with Charli D'Amelio and Addison Rae as the girls, a non-looksmaxxing guy and an ugly profile, because the pool was thin and I filled the slots anyway.** That breaks the casting quality gate and the "Marlon/Hullo/Clav first" rule. Before rendering, re-read the casting rules and list every pick as "name / looksmaxxing-grade yes-no / clean yes-no"; if a slot has none, go to the canon accounts (Marlon, Clavicular, Hullo, p6rs9, itscamsworld, qayro9) before any random Pinterest face. If the inspo's girls are interchangeable fillers, ask once whether the remake should have girls at all.
- **`preview.js`' `centre.jpg` ignores a shot's `vf` (zoom/crop)**, so a post-zoom crop must be checked on the RENDER, five frames per slot. I rendered three times with failing crops because I looked at the wrong tiles.
- **A 720 px wide selfie in a full-width square makes `cx` and `side` useless** (the crop is the whole width). Centre with `"vf": "scale=1404:1404,crop=1080:1080:<x>:<y>"`, computing x and y from where the face sits in the 1080 tile (eyes about 45% of the height).
- **Scene-detect the source before using it** (`select='gt(scene,0.12)',showinfo`): the Hullo clips cut every 0.5 to 1.5 s, so only a 0.5 s stretch was clean; slow it with `setpts` rather than letting a whip land inside the slot.

**Lessons from n34 and n35 (2026-10-18 to 10-19, model portraits and a 28-slot pretty-guys loop; n34 took 4 versions and over an hour, n35 3 versions):**
- **Stills of famous people: Bing Images, not Pinterest or Commons (n34 v4, after "better photos, cmon... take some from google").** Pinterest (`pinimg.mjs`) mostly returns 576-1300 px, soft or AI-generated images (one "Sydney Sweeney" had a Meta AI watermark; AI-looking skin is the tell) and Wikimedia Commons is rate-limited and mostly full-body event shots. What worked in about 3 minutes: scrape `bing.com/images/search?q=<name> face close up portrait&qft=+filterui:imagesize-custom_1800_2400+filterui:aspect-tall` (HTML, no key; or just run `node .claude/skills/remake-edit/bingimg.mjs <dir> "<name> face close up portrait" ...`), which parses the `m` JSON of each `.iusc` link for `murl`, download the originals, keep JPEGs over 150 KB, ffprobe the real size and keep 1300x1700+. Results were real 2000-3000 px photos. Screen with a fit-to-tile (not cropped) labelled sheet, then judge at 100%: soft, a painted-over logo or a visible pad frame all fail.
- **Crop stills, never pad them (n34 v2 to v3).** A pad of white or grey around a photo shows as a border. Pick a source with headroom and crop a 3:4 window from the eye position: crop width = eye distance / 0.30 (0.26 to 0.34 reads like the inspo), eyes at 41% of the crop height, clamp the window inside the image, and check the eye line and x after. If the clamp pushes the face off centre by over 5%, change the photo. Read eye midpoint and eye distance off a 10% grid (`drawgrid=w=iw/10:h=ih/10`).
- **Alternate genders and keep the inspo's slot count exactly (n34 v2).** "Same number of men and women, alternating" on an odd slot count: ask or split one slot, but Davide then said "leave the 7 photos format and put 4 males" (M W M W M W M). Do not change the cut structure on your own.
- **Say early when a casting pool is thin and stop polishing (the n34 hour).** I re-sourced stills four times because I kept judging at thumbnail size. Judge the first batch at 100% before building crops.
- **VFR inspos: normalise first.** A TikTok mp4 can be variable frame rate (n34 was 28.13 fps average, 346 frames for 12.3 s). `ffmpeg -vf fps=30` into `inspo.mp4` before mapping cuts, or every frame number is wrong. Check with `-count_frames` and `avg_frame_rate`.
- **`-shortest` with an audio track shorter than the video drops the last frames.** n34's audio was 12.26 s against a 12.30 s video and lost 2 frames of the black tail. Use `apad` on the audio and `-t` plus `-frames:v`.
- **A callback-loop inspo reuses its looks on purpose (n35).** n35's 28 slots were about 10 looks repeated 3 to 4 times. I reused the same guy and the same moment at each callback, as the inspo does, and told Davide in the wrap-up. Cast one person per LOOK, 8 people for 28 slots, and map the inspo's looks to groups first (contact sheet with one frame per slot, slot indexes stamped).
- **Remove means remove (n35 v2: "completely remove the kid, the Asian looking guy and the blonde guys that seem crying").** Davide judges a face on first sight in the finished video. Before casting, drop: boys who look under 18, soft or crying or mid-sing faces (open mouth, red lip tint, eyes closed), faces half hidden by hair, and anyone whose best frame is a grimace. Prefer sharp jaws and calm direct stares.
- **Pinterest name sweeps found good faces, hashtag lists did not (n35).** `pindl.js <dir> "jacob rott selfie" "vinnie hacker selfie" "josh richards selfie" "cameron porras selfie" "noah beck selfie" ...` returned about 110 vertical clips of mostly real pretty guys (576 px, 4 s loops). A hashtag list (`tikwm.com/api/challenge/posts` for #blondeboy, #prettyboy, #bpedit) was about 90% noise. TikTok accounts of the canon (Clavicular, Hullo vault) were subtitled, wide or watermarked. Make a numbered mid-frame sheet of ALL pindl clips (`ffmpeg -ss 1.2`, `gs2`-style fit tiles) and pick from that.
- **Pinterest loops are 4 s: a slot can run past the end and flicker.** A 16-frame slot starting at 3.5 s of a 4.0 s clip froze and produced extra scene cuts. Check `start + frames/30 < duration - 0.1` for every entry, and compare the remake's scene list to the inspo's after rendering.
- **Large faces in a 720x816 band.** The inspo itself crops hair crowns on its close-ups, so match it: eyes at 40-45% of the band, chin inside, hair top may touch the top. A 9:16 clip into this band uses side 1 (the full width), so `cx` does nothing: when the face sits off centre (a car selfie), add `"vf": "scale=1.35W:1.35H,crop=W:H:x:y"` (band size W:H, computed from where the eyes sit in the band) and check it on the render, not on `centre.jpg`. 576 px sources zoomed 1.3x are soft; choose them last.
- **`preview.js` and `render.js` are slow on 28 slots (about 5 and 8 minutes).** Every change to a start or cy forces a new preview, so batch all crop fixes from one look at `centre.jpg` (cut it into 4 sections with ffmpeg crop, it is 10000 px tall) before re-running, then chain `preview.js && render.js && scorecard.mjs` in one background command.
- **`scorecard/analyse.mjs` needs `gender: "man"` in its answers since the site's quiz added the gender question (2026-10-18).** Without it the API answers "Some answers are missing". For a woman pass `"woman"` (the score scale differs). A card test leaves `source = 'test'` rows: delete them as in the n30 lessons.
- **Card on a 9:16 padded file: run `scorecard.mjs` on `remake_shorts.mp4`** (1080x1920, the card covers the whole frame), `--at` a cut at least 3.6 s before the end with the levers; it worked on a 28.9 s video in about 4 minutes (111 frames).
