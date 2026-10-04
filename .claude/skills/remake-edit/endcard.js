// Appends the Casdey call-to-action end card to a finished edit. The edit is
// untouched; the card plays after it (Davide, 2026-10-04: "the edit stays the
// same, we just add the clip in the end"). Brand direction A, Studio White:
// the mark animates its own idea (the day-1 C fades in at 45%, the day-90 C
// steps up and to the right), then the offer line and a black "link in bio"
// pill. ffmpeg here has no SVG support, so the mark is rasterised from the same
// geometry as brand assets/casdey-mark.svg.
// Usage: node endcard.js <edit.mp4> [--out x.mp4] [--line "Your free glow-up analysis"]
//          [--pill "link in bio"] [--foot "casdey.com"] [--secs 3]
//   (needs FFMPEG=path\to\ffmpeg.exe). Default output: <edit>_cta.mp4, 9:16,
//   CRF 21 so it stays under the 30 MB delivery limit.
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const edit = path.resolve(args.find((a) => !a.startsWith("--")) || "");
const out = path.resolve(opt("--out", edit.replace(/\.mp4$/i, "_cta.mp4")));
const line = opt("--line", "Your free glow-up analysis");
const pill = opt("--pill", "link in bio");
const foot = opt("--foot", "casdey.com");
const secs = Number(opt("--secs", 3));
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const FONT = "/Windows/Fonts/seguisb.ttf"; // no drive letter: see SKILL.md
const INK = "0x1D1D1F";
const GRAPHITE = "0x6E6E73";

const probe = (entries, stream) => execFileSync(FFPROBE, ["-v", "error", ...(stream ? ["-select_streams", stream] : []), "-show_entries", entries, "-of", "csv=p=0", edit]).toString().trim().split(/[\s,]+/);
const [W, H, rate] = probe("stream=width,height,r_frame_rate", "v:0");
const [num, den] = rate.split("/").map(Number);
const fps = Math.round(num / (den || 1));
const hasAudio = probe("stream=sample_rate", "a:0")[0] !== "";
const sr = hasAudio ? probe("stream=sample_rate", "a:0")[0] : "44100";
const k = Number(W) / 1080; // layout is designed at 1080 wide
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "endcard-"));

// --- Rasterise layers (4x4 supersampled coverage, RGBA via ffmpeg rawvideo) ---
function png(file, w, h, rgb, cover) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c = 0;
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) c += cover(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4) ? 1 : 0;
      const i = (y * w + x) * 4;
      buf[i] = rgb[0]; buf[i + 1] = rgb[1]; buf[i + 2] = rgb[2]; buf[i + 3] = Math.round((c / 16) * 255);
    }
  const r = spawnSync(FFMPEG, ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${w}x${h}`, "-i", "-", "-frames:v", "1", file], { input: buf });
  if (r.status) throw new Error(r.stderr.toString());
}

// One C of the mark, in the SVG's 48-unit space: a circle of r 15, stroke 7,
// round caps, dash 76 of its 94.2 circumference, starting at 3 o'clock rotated
// 48 degrees clockwise. Drawn centred in its own square layer.
const U = Math.round(9 * k); // px per mark unit (48 units = 432 px at 1080 wide)
const S = 48 * U;
const arcStart = (48 * Math.PI) / 180;
const arcLen = 76 / 15;
function cMark(px, py) {
  const [x, y] = [px / U - 24, py / U - 24];
  const d = Math.hypot(x, y);
  let a = Math.atan2(y, x) - arcStart;
  a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (a <= arcLen) return Math.abs(d - 15) <= 3.5;
  const end = (t) => [15 * Math.cos(arcStart + t), 15 * Math.sin(arcStart + t)];
  return [end(0), end(arcLen)].some(([ex, ey]) => Math.hypot(x - ex, y - ey) <= 3.5);
}
png(path.join(tmp, "c.png"), S, S, [0x1d, 0x1d, 0x1f], cMark);

// The black pill behind "link in bio".
const PW = Math.round(600 * k);
const PH = Math.round(150 * k);
png(path.join(tmp, "pill.png"), PW, PH, [0x1d, 0x1d, 0x1f], (x, y) => {
  const r = PH / 2;
  const cx = Math.min(Math.max(x, r), PW - r);
  return Math.hypot(x - cx, y - r) <= r;
});

fs.writeFileSync(path.join(tmp, "line.txt"), line);
fs.writeFileSync(path.join(tmp, "pill.txt"), pill);
fs.writeFileSync(path.join(tmp, "foot.txt"), foot);

// --- Animate the card ---
// Times in seconds. ease(t0, t1) runs 0 to 1 with an ease-out between t0 and t1.
const ease = (t0, t1) => `(1-pow(1-clip((t-${t0})/${t1 - t0}\\,0\\,1)\\,3))`;
const markY = Math.round(Number(H) * 0.34); // centre of the mark
const step = 3 * U; // the day-90 C sits 3 units up and right of day 1
const lineY = Math.round(markY + S / 2 + 110 * k);
const pillY = Math.round(lineY + 160 * k);
const rise = Math.round(24 * k);
const graph = [
  `color=white:s=${W}x${H}:r=${fps}:d=${secs}[bg]`,
  // Day 1: fades in to 45% where it stands.
  `[1:v]format=rgba,colorchannelmixer=aa=0.45,fade=t=in:st=0.05:d=0.35:alpha=1[c1]`,
  // Day 90: appears on top of day 1, then steps up and to the right.
  `[1:v]format=rgba,fade=t=in:st=0.35:d=0.2:alpha=1[c2]`,
  `[2:v]format=rgba,fade=t=in:st=1.05:d=0.3:alpha=1[pill]`,
  `[bg][c1]overlay=x=(W-w)/2-${step / 2}:y=${markY}-h/2+${step / 2}[a]`,
  `[a][c2]overlay=x=(W-w)/2-${step / 2}+${step}*${ease(0.45, 0.95)}:y=${markY}-h/2+${step / 2}-${step}*${ease(0.45, 0.95)}[b]`,
  `[b]drawtext=fontfile='${FONT}':textfile=line.txt:fontsize=${Math.round(70 * k)}:fontcolor=${INK}:x=(w-tw)/2:y=${lineY}+${rise}*(1-${ease(0.75, 1.15)}):alpha='${ease(0.75, 1.15)}'[c]`,
  `[c][pill]overlay=x=(W-w)/2:y=${pillY}[d]`,
  `[d]drawtext=fontfile='${FONT}':textfile=pill.txt:fontsize=${Math.round(60 * k)}:fontcolor=white:x=(w-tw)/2:y=${pillY}+(${PH}-th)/2-${Math.round(4 * k)}:alpha='${ease(1.1, 1.4)}'[e]`,
  `[e]drawtext=fontfile='${FONT}':textfile=foot.txt:fontsize=${Math.round(42 * k)}:fontcolor=${GRAPHITE}:x=(w-tw)/2:y=${pillY + PH + Math.round(70 * k)}:alpha='${ease(1.3, 1.7)}',format=yuv420p[v]`,
].join(";");
const card = path.join(tmp, "card.mp4");
const r = spawnSync(FFMPEG, ["-v", "error", "-y", "-f", "lavfi", "-i", `anullsrc=r=${sr}:cl=stereo`, "-loop", "1", "-i", path.join(tmp, "c.png"), "-loop", "1", "-i", path.join(tmp, "pill.png"),
  "-filter_complex", graph, "-map", "[v]", "-map", "0:a", "-t", String(secs), "-r", String(fps), "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "192k", card], { cwd: tmp });
if (r.status) throw new Error(r.stderr.toString());

// --- Edit + card, re-encoded once at delivery quality ---
const editAudio = hasAudio ? "[0:a]" : null;
const concat = editAudio
  ? `[0:v]setsar=1,fps=${fps},format=yuv420p[e];[1:v]setsar=1[k];[0:a]aresample=${sr}[ea];[e][ea][k][1:a]concat=n=2:v=1:a=1[v][a]`
  : `[0:v]setsar=1,fps=${fps},format=yuv420p[e];[1:v]setsar=1[k];anullsrc=r=${sr}:cl=stereo,atrim=0:0.01[ea];[e][k]concat=n=2:v=1:a=0[v]`;
const r2 = spawnSync(FFMPEG, ["-v", "error", "-y", "-i", edit, "-i", card, "-filter_complex", concat, "-map", "[v]", ...(editAudio ? ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"] : ["-an"]),
  "-c:v", "libx264", "-crf", "21", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
if (r2.status) throw new Error(r2.stderr.toString());
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${out}: ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
