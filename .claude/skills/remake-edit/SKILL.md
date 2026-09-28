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
  missing and the filter segfaults without it).
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
- Per source, a timestamped sheet: `fps=1/N,scale=240:-2,drawtext=...%{pts\:hms}...,tile=8x6`.
- One shot per replaced slot, matching the slot's energy (smile, glance, laugh
  on the beat) and length. Prefer close faces, avoid lower-thirds, logos,
  other people and cutaways.
- Record crop centre (cx, cy as fractions of the frame) and `side` (crop height
  as a fraction of source height) per shot by reading a single frame.
- Lessons from the first remake (2026-09-28, Davide posted it):
  - **Long slots (over 1.5 s) need a steady subject.** Check the frame every
    0.5 s across the whole slot, not one frame: the 3.8 s opening shot drifted
    off-centre as he moved. Pick a calmer moment or loosen the crop (`side`
    higher).
  - **One scene per source, once.** Don't reuse the same interview set for two
    slots (Troy appeared twice); variety of settings is what makes the montage
    feel rich.
  - **Quality first when choosing sources.** Prefer 720p+ uploads; 240p-480p TV
    rips look soft next to the inspo. Search for "HD" or "remastered" versions
    before settling.

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
