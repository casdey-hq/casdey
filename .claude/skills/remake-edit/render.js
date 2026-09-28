// Renders a remake from plan.json (see SKILL.md): every timeline entry is either
// a range kept from the inspo or a new shot cropped square from a source clip,
// each cut to an exact frame count. The inspo's audio runs underneath.
// Usage: node render.js <workdir>   (needs FFMPEG=path\to\ffmpeg.exe or ffmpeg on PATH)
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || ".");
const plan = JSON.parse(fs.readFileSync(path.join(dir, "plan.json"), "utf8"));
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const fps = plan.fps || 30;
const [W, H] = plan.size || [1080, 1080];
const grade = plan.grade ?? "eq=contrast=1.06:saturation=1.1,unsharp=5:5:0.6";
const inspo = path.join(dir, plan.inspo);
const segDir = path.join(dir, "seg");

const ff = (args) => execFileSync(FFMPEG, ["-v", "error", "-y", ...args], { stdio: "inherit" });
const dims = (f) => execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=p=0", f]).toString().trim().split(",").map(Number);
const enc = ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", String(fps), "-an"];

fs.rmSync(segDir, { recursive: true, force: true });
fs.mkdirSync(segDir);

const names = plan.timeline.map((entry, i) => {
  const out = path.join(segDir, `${String(i).padStart(3, "0")}.mp4`);
  if (entry.image) {
    // A still (a rebuilt slide), held for `frames`; `vf` can animate it (e.g. a whip-in blur).
    const vf = [`scale=${W}:${H}`, "setsar=1", entry.vf].filter(Boolean).join(",");
    ff(["-loop", "1", "-framerate", String(fps), "-i", path.join(dir, entry.image), "-vf", vf, "-frames:v", String(entry.frames), ...enc, out]);
  } else if (entry.keep) {
    // Kept part of the inspo, frame-exact: [from, to) in inspo frames.
    const [from, to] = entry.keep;
    ff(["-i", inspo, "-vf", `fps=${fps},trim=start_frame=${from}:end_frame=${to},setpts=PTS-STARTPTS,scale=${W}:${H},setsar=1`, ...enc, out]);
  } else {
    const src = path.join(dir, entry.src);
    const [w, h] = dims(src);
    // Crop the largest box with the output's aspect ratio that fits `side` x source height.
    const ch = Math.round(Math.min(entry.side * h, h, (w * H) / W));
    const cw = Math.round((ch * W) / H);
    const x = Math.round(Math.min(Math.max(entry.cx * w - cw / 2, 0), w - cw));
    const y = Math.round(Math.min(Math.max(entry.cy * h - ch / 2, 0), h - ch));
    const vf = [`fps=${fps}`, `crop=${cw}:${ch}:${x}:${y}`, `scale=${W}:${H}:flags=lanczos`, grade, entry.vf, "setsar=1"].filter(Boolean).join(",");
    ff(["-ss", String(entry.start), "-i", src, "-vf", vf, "-frames:v", String(entry.frames), ...enc, out]);
  }
  return path.basename(out);
});

// Join through the concat filter and re-encode: a stream-copy join drops frames
// where segment timestamps meet (4 lost at 60 fps on the second remake).
const output = path.join(dir, plan.output || "remake.mp4");
const want = plan.timeline.reduce((n, e) => n + (e.keep ? e.keep[1] - e.keep[0] : e.frames), 0);
const inputs = names.flatMap((n) => ["-i", path.join(segDir, n)]);
const join = `${names.map((_, i) => `[${i}:v]`).join("")}concat=n=${names.length}:v=1:a=0[v]`;
ff([...inputs, "-i", inspo, "-filter_complex", join, "-map", "[v]", "-map", `${names.length}:a?`, ...enc.filter((a) => a !== "-an"), "-c:a", "aac", "-b:a", "192k", "-frames:v", String(want), "-t", (want / fps).toFixed(4), "-movflags", "+faststart", output]);
const got = Number(execFileSync(FFPROBE, ["-v", "error", "-count_frames", "-select_streams", "v", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", output]).toString().trim());
if (got !== want) throw new Error(`rendered ${got} frames, plan has ${want}`);
console.log(`done: ${output} (${got} frames)`);

// YouTube Shorts crops anything that isn't 9:16 (TikTok and Instagram letterbox
// it themselves), so a non-vertical edit also gets a 1080x1920 copy, centred on black.
if (W * 16 !== H * 9) {
  const shorts = output.replace(/(\.\w+)$/, "_shorts$1");
  const scale = W / H > 9 / 16 ? "scale=1080:-2" : "scale=-2:1920";
  ff(["-i", output, "-vf", `${scale},pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1`, "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", shorts]);
  console.log(`done: ${shorts}`);
}
