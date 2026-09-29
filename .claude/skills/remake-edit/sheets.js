// Frame-exact contact sheets for picking shots: one JPG per source, 120 tiles,
// each stamped with the source id and the tile's real time in seconds.
// Selects by frame number (the fps filter mislabels times, see SKILL.md).
// Usage: node sheets.js <workdir> [src/a.mp4 ...]   (needs FFMPEG=path\to\ffmpeg.exe)
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || ".");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const FONT = "C\\:/Windows/Fonts/arialbd.ttf";
const files = process.argv.length > 3
  ? process.argv.slice(3)
  : fs.readdirSync(path.join(dir, "src")).filter((f) => /\.(mp4|webm|mkv)$/.test(f)).map((f) => path.join("src", f));
fs.mkdirSync(path.join(dir, "sheets"), { recursive: true });

for (const rel of files) {
  const src = path.join(dir, rel);
  const id = path.basename(rel).replace(/\.\w+$/, "");
  const [rate, duration] = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v", "-show_entries", "stream=r_frame_rate:format=duration", "-of", "csv=p=0", src])
    .toString().split(/\s+/).filter(Boolean);
  const [num, den] = rate.split("/").map(Number);
  const fps = num / (den || 1);
  const step = Math.max(0.5, Math.ceil((Number(duration) / 120) * 2) / 2);
  const every = Math.max(1, Math.round(step * fps));
  const vf = [
    `select='not(mod(n\\,${every}))'`,
    "scale=160:90:force_original_aspect_ratio=decrease,pad=160:90:(ow-iw)/2:(oh-ih)/2",
    `drawtext=fontfile='${FONT}':text='${id.slice(0, 4)} %{pts\\:flt}':x=1:y=1:fontsize=10:fontcolor=yellow:box=1:boxcolor=black`,
    "tile=12x10",
  ].join(",");
  execFileSync(FFMPEG, ["-v", "error", "-y", "-i", src, "-vf", vf, "-fps_mode", "passthrough", "-frames:v", "1", path.join(dir, "sheets", `${id}.jpg`)], { stdio: "inherit" });
  console.log(`${id}: a tile every ${step}s`);
}
