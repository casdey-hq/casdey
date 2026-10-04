// Appends the Casdey call-to-action end card to a finished edit. The edit is
// untouched; the card plays after it (Davide, 2026-10-04: "the edit stays the
// same, we just add the clip in the end"). Dark version of direction A (Ink
// background, white mark, as in brand assets/casdey-logo-dark.png; Davide
// picked dark over Studio White on 2026-10-04). The mark animates its own idea:
// the day-1 C fades in at 45%, the day-90 C steps up and to the right. Then the
// offer line, a white "link in bio" pill and casdey.com.
// Smoothness (Davide, 2026-10-04: v1 "should be more smooth"): the edit
// crossfades into the card, every fade is a slow smootherstep, the mark is
// rendered here frame by frame with sub-pixel positions (ffmpeg's overlay
// snaps to whole pixels and judders), and the text fades without moving.
// Usage: node endcard.js <edit.mp4> [--out x.mp4] [--line "Your free glow-up analysis"]
//          [--pill "link in bio"] [--foot "casdey.com"] [--secs 3.5]
//   (needs FFMPEG=path\to\ffmpeg.exe). Default output: <edit>_cta.mp4, CRF 21
//   so it stays under the 30 MB delivery limit.
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
const secs = Number(opt("--secs", 3.5));
const XF = 0.5; // crossfade from the edit into the card
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const FONT = "/Windows/Fonts/seguisb.ttf"; // no drive letter: see SKILL.md
const BG = "0x1D1D1F"; // Ink
const INK = "0x1D1D1F";
const SECONDARY = "0xA1A1A6"; // Apple's secondary label on dark

const probe = (entries, stream) => execFileSync(FFPROBE, ["-v", "error", ...(stream ? ["-select_streams", stream] : []), "-show_entries", entries, "-of", "csv=p=0", edit]).toString().trim().split(/[\s,]+/);
const [W, H, rate] = probe("stream=width,height,r_frame_rate", "v:0").map((v, i) => (i < 2 ? Number(v) : v));
const [num, den] = rate.split("/").map(Number);
const fps = Math.round(num / (den || 1));
const duration = Number(probe("format=duration")[0]);
const sr = probe("stream=sample_rate", "a:0")[0] || "";
const hasAudio = sr !== "";
const k = W / 1080; // layout is designed at 1080 wide
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "endcard-"));

const clamp = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (t0, t1, t) => { const x = clamp((t - t0) / (t1 - t0)); return x * x * x * (x * (6 * x - 15) + 10); };
// Same curve as an ffmpeg expression (commas escaped for the filtergraph).
const smoothExpr = (t0, t1) => { const x = `clip((t-${t0})/${t1 - t0}\\,0\\,1)`; return `(${x}*${x}*${x}*(${x}*(6*${x}-15)+10))`; };

// --- The mark, frame by frame ---
// One C in the SVG's 48-unit space: r 15, stroke 7, round caps, dash 76 of the
// 94.2 circumference, starting at 3 o'clock rotated 48 degrees clockwise.
// Coverage is the analytic signed distance, so edges stay crisp at any
// sub-pixel position.
const U = 9 * k; // px per mark unit (48 units = 432 px at 1080 wide)
const step = 3 * U; // the day-90 C sits 3 units up and right of day 1
const arcStart = (48 * Math.PI) / 180;
const arcLen = 76 / 15;
const caps = [0, arcLen].map((t) => [15 * Math.cos(arcStart + t), 15 * Math.sin(arcStart + t)]);
function cCoverage(x, y) {
  let a = Math.atan2(y, x) - arcStart;
  a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const d = a <= arcLen ? Math.abs(Math.hypot(x, y) - 15) : Math.min(...caps.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));
  return clamp(0.5 - (d - 3.5) * U);
}
const L = Math.ceil(48 * U + step + 8); // layer side, centred on the mark
const T = { back: [0.25, 0.85], frontIn: [0.55, 0.95], move: [0.65, 1.45], line: [1.15, 1.65], pill: [1.4, 1.9], foot: [1.65, 2.15] };
const frames = Math.round(secs * fps);
const back = new Float32Array(L * L);
for (let py = 0; py < L; py++)
  for (let px = 0; px < L; px++)
    back[py * L + px] = cCoverage((px + 0.5 - (L / 2 - step / 2)) / U, (py + 0.5 - (L / 2 + step / 2)) / U);
const raw = Buffer.alloc(frames * L * L * 4, 255);
for (let f = 0; f < frames; f++) {
  const t = f / fps;
  const a1 = 0.45 * smooth(...T.back, t);
  const a2 = smooth(...T.frontIn, t);
  const e = smooth(...T.move, t);
  const [fx, fy] = [L / 2 - step / 2 + step * e, L / 2 + step / 2 - step * e];
  const base = f * L * L * 4;
  for (let py = 0; py < L; py++)
    for (let px = 0; px < L; px++) {
      const i = py * L + px;
      const c1 = back[i] * a1;
      const c2 = a2 ? cCoverage((px + 0.5 - fx) / U, (py + 0.5 - fy) / U) * a2 : 0;
      raw[base + i * 4 + 3] = Math.round((c2 + c1 * (1 - c2)) * 255);
    }
}
const markFile = path.join(tmp, "mark.mov");
let r = spawnSync(FFMPEG, ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${L}x${L}`, "-r", String(fps), "-i", "-", "-c:v", "qtrle", markFile], { input: raw, maxBuffer: 1 << 30 });
if (r.status) throw new Error(r.stderr.toString());

// --- The white pill behind "link in bio" (analytic edge too) ---
const PW = Math.round(600 * k);
const PH = Math.round(150 * k);
const pillBuf = Buffer.alloc(PW * PH * 4, 255);
for (let y = 0; y < PH; y++)
  for (let x = 0; x < PW; x++) {
    const rr = PH / 2;
    const cx = Math.min(Math.max(x + 0.5, rr), PW - rr);
    pillBuf[(y * PW + x) * 4 + 3] = Math.round(clamp(0.5 - (Math.hypot(x + 0.5 - cx, y + 0.5 - rr) - rr)) * 255);
  }
r = spawnSync(FFMPEG, ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${PW}x${PH}`, "-i", "-", "-frames:v", "1", path.join(tmp, "pill.png")], { input: pillBuf });
if (r.status) throw new Error(r.stderr.toString());

fs.writeFileSync(path.join(tmp, "line.txt"), line);
fs.writeFileSync(path.join(tmp, "pill.txt"), pill);
fs.writeFileSync(path.join(tmp, "foot.txt"), foot);

// --- The card ---
const markY = Math.round(H * 0.34);
const lineY = Math.round(markY + 24 * U + 110 * k);
const pillY = Math.round(lineY + 160 * k);
const text = (file, size, color, y, [t0, t1]) =>
  `drawtext=fontfile='${FONT}':textfile=${file}:fontsize=${Math.round(size * k)}:fontcolor=${color}:x=(w-tw)/2:y=${y}:alpha='${smoothExpr(t0, t1)}'`;
const graph = [
  `color=${BG}:s=${W}x${H}:r=${fps}:d=${secs}[bg]`,
  `[bg][1:v]overlay=x=(W-w)/2:y=${markY}-h/2:format=auto[a]`,
  `[a]${text("line.txt", 70, "white", lineY, T.line)}[b]`,
  `[2:v]format=rgba,fade=t=in:st=${T.pill[0]}:d=${T.pill[1] - T.pill[0]}:alpha=1[pill]`,
  `[b][pill]overlay=x=(W-w)/2:y=${pillY}[c]`,
  `[c]${text("pill.txt", 60, INK, `${pillY}+(${PH}-th)/2-${Math.round(4 * k)}`, T.pill)},${text("foot.txt", 42, SECONDARY, pillY + PH + Math.round(70 * k), T.foot)},format=yuv420p[v]`,
].join(";");
const card = path.join(tmp, "card.mp4");
r = spawnSync(FFMPEG, ["-v", "error", "-y", "-f", "lavfi", "-i", `anullsrc=r=${sr || 44100}:cl=stereo`, "-i", markFile, "-loop", "1", "-i", path.join(tmp, "pill.png"),
  "-filter_complex", graph, "-map", "[v]", "-map", "0:a", "-t", String(secs), "-r", String(fps), "-c:v", "libx264", "-crf", "16", "-c:a", "aac", "-b:a", "192k", card], { cwd: tmp });
if (r.status) throw new Error(r.stderr.toString());

// --- Edit crossfading into the card, re-encoded once at delivery quality ---
const vid = `[0:v]fps=${fps},setsar=1,format=yuv420p,settb=AVTB[e];[1:v]fps=${fps},setsar=1,format=yuv420p,settb=AVTB[k];[e][k]xfade=transition=fade:duration=${XF}:offset=${(duration - XF).toFixed(3)}[v]`;
const aud = hasAudio ? `;[0:a]aresample=${sr}[ea];[1:a]aresample=${sr}[ka];[ea][ka]acrossfade=d=${XF}[a]` : "";
r = spawnSync(FFMPEG, ["-v", "error", "-y", "-i", edit, "-i", card, "-filter_complex", vid + aud, "-map", "[v]", ...(hasAudio ? ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"] : ["-an"]),
  "-c:v", "libx264", "-crf", "21", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
if (r.status) throw new Error(r.stderr.toString());
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${out}: ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
