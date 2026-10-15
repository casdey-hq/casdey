// Shows where each new shot's crop lands before rendering: for every source
// entry in plan.json it grabs the five frames of the slot (start, quarter, middle, three quarters, end),
// draws the crop box (green) and its centre line (red) on the full source frame,
// and tiles them into preview.jpg, one row per shot. A face that drifts out of
// the box or off the red line shows up here instead of in the finished video.
// It also writes centre.jpg: the ACTUAL cropped result of every shot (first, middle, last frame) at a
// readable size with guides: red = vertical centre line (nose goes on it), yellow = eye line at 40% of
// the height, cyan = the 8% top and bottom margins (hair and chin must sit inside them). This is the
// centring gate in SKILL.md: look at it and fix every shot that fails before rendering.
// Usage: node preview.js <workdir>   (needs FFMPEG=path\to\ffmpeg.exe or ffmpeg on PATH)
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || ".");
const plan = JSON.parse(fs.readFileSync(path.join(dir, "plan.json"), "utf8"));
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const fps = plan.fps || 30;
const [W, H] = plan.size || [1080, 1080];
const tmp = path.join(dir, "preview");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp);

const dims = (f) => execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=p=0", f]).toString().trim().split(",").map(Number);
let n = 0, m = 0;
const ctmp = path.join(dir, "preview_centre");
fs.rmSync(ctmp, { recursive: true, force: true });
fs.mkdirSync(ctmp);
const shots = plan.timeline.filter((e) => e.src && !e.image);
shots.forEach((entry, row) => {
  const src = path.join(dir, entry.src);
  const [w, h] = dims(src);
  // Same crop maths as render.js.
  const [bw, bh] = entry.band || plan.band || [W, H];
  const ch = Math.round(Math.min((entry.side ?? 1) * h, h, (w * bh) / bw));
  const cw = Math.round((ch * bw) / bh);
  const x = Math.round(Math.min(Math.max(entry.cx * w - cw / 2, 0), w - cw));
  const y = Math.round(Math.min(Math.max(entry.cy * h - ch / 2, 0), h - ch));
  const lw = Math.max(2, Math.round(h / 180));
  [0, 0.25, 0.5, 0.75, 1].map((q) => Math.min(entry.frames - 1, Math.round(q * (entry.frames - 1)))).forEach((f) => {
    const t = (entry.start + f / fps).toFixed(3);
    const out = path.join(tmp, `${String(n++).padStart(3, "0")}.png`);
    const vf = [
      `drawbox=x=${x}:y=${y}:w=${cw}:h=${ch}:color=lime:t=${lw}`,
      `drawbox=x=${x + Math.round(cw / 2) - lw}:y=${y}:w=${lw * 2}:h=${ch}:color=red:t=fill`,
      "scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2",
      `drawtext=fontfile='/Windows/Fonts/arialbd.ttf':text='${row + 1} ${path.basename(entry.src).replace(/[':]/g, "")} ${t}':fontcolor=yellow:fontsize=16:x=4:y=4:box=1:boxcolor=black`,
    ].join(",");
    execFileSync(FFMPEG, ["-v", "error", "-y", "-ss", t, "-i", src, "-frames:v", "1", "-vf", vf, out]);
    // The real crop, with the centring guides.
    const S = 320, g = 2;
    const cvf = [
      `crop=${cw}:${ch}:${x}:${y}`,
      `scale=${S}:${Math.round((S * ch) / cw)}`,
      `drawbox=x=${S / 2 - g / 2}:y=0:w=${g}:h=ih:color=red:t=fill`,
      `drawbox=x=0:y=ih*0.4:w=iw:h=${g}:color=yellow:t=fill`,
      `drawbox=x=0:y=ih*0.08:w=iw:h=1:color=cyan:t=fill`,
      `drawbox=x=0:y=ih*0.92:w=iw:h=1:color=cyan:t=fill`,
      `drawtext=fontfile='/Windows/Fonts/arialbd.ttf':text='${row + 1} ${t}':fontcolor=yellow:fontsize=16:x=4:y=4:box=1:boxcolor=black`,
    ].join(",");
    execFileSync(FFMPEG, ["-v", "error", "-y", "-ss", t, "-i", src, "-frames:v", "1", "-vf", cvf, path.join(ctmp, `${String(m++).padStart(3, "0")}.png`)]);
  });
});
execFileSync(FFMPEG, ["-v", "error", "-y", "-i", path.join(tmp, "%03d.png"), "-vf", `tile=5x${shots.length}`, "-frames:v", "1", path.join(dir, "preview.jpg")]);
execFileSync(FFMPEG, ["-v", "error", "-y", "-i", path.join(ctmp, "%03d.png"), "-vf", `tile=5x${shots.length}:padding=2`, "-frames:v", "1", path.join(dir, "centre.jpg")]);
// render.js refuses to run unless this stamp matches the plan's current crops,
// so a crop changed after the preview can't reach the video unchecked
// (2026-09-30: every crop was tightened after the preview and heads came out cut).
fs.writeFileSync(path.join(dir, "preview.stamp"), require("./cropstamp")(plan));
console.log(`done: ${path.join(dir, "preview.jpg")} and ${path.join(dir, "centre.jpg")} (${shots.length} shots). Open centre.jpg and check every tile against the centring gate.`);
