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
- **Adults only.** Anyone kept from the inspo or added as new footage must
  clearly be an adult. If the hook or the style depends on someone who looks
  under 18, stop, say why, and offer an adult alternative. Never put
  "mogged"-style ridicule on a private person or a minor. (2026-09-28: the first
  inspo, a young girl captioned "MOGGED", was refused for this reason.)
- **Ask before downloading.** List the source videos (title, id, rough size)
  and get a yes before running yt-dlp. Tool installs also need a yes.
- **Heads-up on rights, once.** Celebrity/TV/Getty footage is what these edits
  run on, but on a brand account it can get muted or taken down. Say it once
  when proposing sources; don't nag.
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
- Captions redrawn on new shots (e.g. "The funny guy", 2026-09-30): `drawtext`
  with `segoeuib.ttf`, white, `borderw=5:bordercolor=black`, centred, sized and
  placed to match the inspo. For an ending fade, put `fade=t=out` before the
  `drawtext` in the same `vf` so the caption stays on black like the inspo.
- Letterboxed sources (films, scene packs): run `cropdetect` on the slot and
  set `side` just inside the picture height (e.g. 0.92) so no black bar shows.
- The browser pane can't decode video while hidden; don't use it for frames.

Work in the session scratchpad (`<scratchpad>/remake-<name>/`), never the repo.

## Steps

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

### 2. Adult check
Look at every person in kept parts and at what the style needs. Apply the hard
rule above before going further.

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
- Drop sources the subject isn't in (a cast interview can be all co-stars).
- **No watermarks or logos in frame**: Getty, POPSUGAR, tv.aol.com, photo-agency
  ID numbers. Check the corners of each pick and crop tighter (`side` lower,
  shift `cy` up) or swap the source.
- Fan edits re-cut the same clips: skip any stretch of a source that contains
  the inspo's own shots.
- One shot per replaced slot, matching the slot's energy (smile, glance, laugh
  on the beat) and length. Prefer close faces, avoid lower-thirds, logos,
  other people and cutaways.
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
- **Before rendering, run `preview.js`** (`FFMPEG=... node
  .claude/skills/remake-edit/preview.js <workdir>`): it draws each shot's crop
  box and centre line on the source's first, middle and last frame of the slot
  into `preview.jpg`. Guessing `cx` from grids was off by up to 0.2 on
  2026-09-30 (faces landed at the frame edge); the preview shows drift, cut
  heads and watermarks at once. Fix `cx`/`start` until every face sits on the
  red line in all three frames.
- Casting Clavicular: he was charged with raping a 17-year-old (charges filed
  2026-09-08, public 2026-09-22). Leave him out unless Davide says otherwise.
- **Cast looksmaxxing faces, not actors (Davide, 2026-09-30, the most important
  casting rule).** Casdey's audience knows the looksmaxxing canon, so the new
  faces must be the guys that world worships: male models with textbook
  features (sharp jaw, hunter eyes, great hair, e.g. Francisco Lachowski,
  Jordan Barrett, Sean O'Pry, Matthew Noszka, Parker van Noord, Lucky Blue
  Smith) and pretty-boy / looksmaxxing influencers and TikTokers. A cast of
  mainstream actors (Bridgerton, Saltburn, Outer Banks) got "who the fuck are
  these guys". Prefer their own front-camera, selfie, GRWM and close-up
  content over film or talk-show footage. Adults-only still applies: only use
  someone whose adult age is clear.
- **Every replaced slot gets a different face (Davide, 2026-09-30).** If the
  inspo shows 7 different people, the remake shows 7 different people; never
  fill slots with the same person from other scenes. If a download fails or a
  source is too soft, find another person instead of reusing one.
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
TikTok and Instagram letterbox it fine. Send both files and say which is for
Shorts.

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
`side: 1`. **Picture bands** (the shots sit in a band inside 9:16): render at the full
size and set `band: [bw, bh, x, y]` (from `cropdetect`) at the top level or
per entry. The renderer then crops each source to the band's aspect and pads
it into place. **Never** crop the band out afterwards in `vf`: on 2026-09-29
that cropped a 9:16 strip, blew it up and cut it again, so every face came
out giant and cut off. Entries can override `grade` (e.g. `"null"` for a
pre-built transition) and `band` (e.g. `[1080,1920,0,0]` for a full-frame
segment). **Minors in the montage**: if the replaceable footage shows
someone who may be under 18, don't copy him; ask Davide for the source
(an adult creator, an adult celebrity, or his own footage).

`keep` ranges are inspo frames `[from, to)`; `frames` per shot = the slot's
length in frames, so the sum equals the inspo's frame count. `grade` (optional,
top level) overrides the default look; `vf` adds a filter to one shot.

### 6. Verify before sending
- Frame count and duration equal the inspo's.
- Per shot, a strip of its first, middle and last frame: catches cutaways to
  other people or the interviewer at the edges of a shot (happened three times
  on the first run). Fix `start` and re-render.
- Send the file with `SendUserFile` and list what was kept, what was replaced
  and from where, plus an honest list of what's still weak.
