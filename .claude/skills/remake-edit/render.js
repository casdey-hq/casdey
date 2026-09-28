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
  if (entry.keep) {
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

const list = path.join(segDir, "list.txt");
fs.writeFileSync(list, names.map((n) => `file '${n}'`).join("\n"));
const output = path.join(dir, plan.output || "remake.mp4");
ff(["-f", "concat", "-safe", "0", "-i", list, "-i", inspo, "-map", "0:v", "-map", "1:a?", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", output]);
console.log(`done: ${output}`);

// YouTube Shorts crops anything that isn't 9:16 (TikTok and Instagram letterbox
// it themselves), so a non-vertical edit also gets a 1080x1920 copy, centred on black.
if (W * 16 !== H * 9) {
  const shorts = output.replace(/(\.\w+)$/, "_shorts$1");
  const scale = W / H > 9 / 16 ? "scale=1080:-2" : "scale=-2:1920";
  ff(["-i", output, "-vf", `${scale},pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1`, "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", shorts]);
  console.log(`done: ${shorts}`);
}
