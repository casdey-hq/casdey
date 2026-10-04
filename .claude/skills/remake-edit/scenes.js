// One tile per scene across many sources, for casting: every scene (the stretch
// between two cuts inside a source) gets one numbered tile, stamped with its
// source, start and length. scenes.tsv lists them, so a pick is a lookup:
// start the shot at least 0.1 s after the scene's start, and only cast scenes at
// least as long as the slot, or a source's own cut lands between beats.
// Usage: node scenes.js <workdir> [--min 0.8] [--thr 0.15] [src/a.mp4 ...]
//   (needs FFMPEG=path\to\ffmpeg.exe). Reads every video in <workdir>/src when
//   no files are given. Writes <workdir>/scenes/sheet-01.jpg... and scenes.tsv.
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = Number(args[i + 1]);
  args.splice(i, 2);
  return v;
};
const minLen = opt("--min", 0.8); // skip scenes shorter than this (seconds)
const thr = opt("--thr", 0.15); // same threshold as the step 6 sync check
const dir = path.resolve(args[0] || ".");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const FONT = "C\\:/Windows/Fonts/arialbd.ttf";
const [TW, TH, COLS, ROWS] = [180, 320, 8, 4];
const files = args.length > 1
  ? args.slice(1)
  : fs.readdirSync(path.join(dir, "src")).filter((f) => /\.(mp4|webm|mkv|mov)$/i.test(f)).map((f) => path.join("src", f));

const out = path.join(dir, "scenes");
const tiles = path.join(out, "tiles");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(tiles, { recursive: true });

const rows = [["n", "src", "start", "end", "len"]];
let n = 0;
for (const rel of files) {
  const src = path.join(dir, rel);
  const id = path.basename(rel).replace(/\.\w+$/, "");
  const duration = Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).toString().trim());
  // Scene detect: showinfo prints pts_time for every frame that starts a scene.
  const log = spawnSync(FFMPEG, ["-hide_banner", "-i", src, "-vf", `select='gt(scene,${thr})',showinfo`, "-an", "-f", "null", "-"], { maxBuffer: 64 << 20 }).stderr.toString();
  const cuts = [...log.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
  const bounds = [0, ...cuts, duration];
  let kept = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const [a, b] = [bounds[i], bounds[i + 1]];
    if (b - a < minLen) continue;
    n++;
    kept++;
    // The middle of the scene: clear of flashes and shake fan edits put on cuts.
    const t = (a + b) / 2;
    const label = `#${n} ${id.slice(0, 6)}  ${a.toFixed(1)}s +${(b - a).toFixed(1)}`;
    const vf = [
      `scale=${TW}:${TH}:force_original_aspect_ratio=decrease`,
      `pad=${TW}:${TH}:(ow-iw)/2:(oh-ih)/2`,
      `drawtext=fontfile='${FONT}':text='${label}':x=2:y=2:fontsize=13:fontcolor=yellow:box=1:boxcolor=black`,
    ].join(",");
    execFileSync(FFMPEG, ["-v", "error", "-y", "-ss", t.toFixed(3), "-i", src, "-vf", vf, "-frames:v", "1", path.join(tiles, `${String(n).padStart(4, "0")}.jpg`)]);
    rows.push([n, rel.replace(/\\/g, "/"), a.toFixed(2), b.toFixed(2), (b - a).toFixed(2)]);
  }
  console.log(`${id}: ${bounds.length - 1} scenes, ${kept} kept (>= ${minLen}s)`);
}

// Pages of COLS x ROWS tiles. The last page is filled with black tiles, since
// the tile filter drops an incomplete page.
const per = COLS * ROWS;
const black = path.join(tiles, "black.jpg");
if (n % per) execFileSync(FFMPEG, ["-v", "error", "-y", "-f", "lavfi", "-i", `color=black:s=${TW}x${TH}`, "-frames:v", "1", black]);
for (let p = 0; p * per < n; p++) {
  const page = Array.from({ length: per }, (_, i) => p * per + i + 1)
    .map((k) => (k <= n ? path.join(tiles, `${String(k).padStart(4, "0")}.jpg`) : black));
  const list = path.join(tiles, `page-${p + 1}.txt`);
  fs.writeFileSync(list, page.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n") + "\n");
  execFileSync(FFMPEG, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", `tile=${COLS}x${ROWS}:padding=2:color=black`, "-frames:v", "1", path.join(out, `sheet-${String(p + 1).padStart(2, "0")}.jpg`)]);
}
fs.writeFileSync(path.join(out, "scenes.tsv"), rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`${n} scenes on ${Math.ceil(n / (COLS * ROWS))} sheet(s) in ${out}`);
