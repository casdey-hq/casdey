// Matches each new shot's brightness to the inspo slot it replaces (dark night
// edits: raw source clips came out 2-4x brighter than the inspo, 2026-09-30).
// Renders plan.json with no grade, measures the mean luma of every replaced slot
// in the inspo and in that render (inside the picture band if the plan has one),
// and writes a per-shot `eq=gamma` into plan.json (base saved as plan_base.json).
// Then run render.js as usual. Usage: node gradematch.js <workdir>
// (needs FFMPEG=path\to\ffmpeg.exe; run it after preview.js looks right)
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || ".");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const base = JSON.parse(fs.readFileSync(path.join(dir, "plan.json"), "utf8"));
fs.writeFileSync(path.join(dir, "plan_base.json"), JSON.stringify(base, null, 1));

const [W, H] = base.size || [1080, 1080];
const [, bh, , by] = base.band || [W, H, 0, 0];
const crop = `crop=iw:ih*${(bh / H).toFixed(4)}:0:ih*${(by / H).toFixed(4)}`;

const raw = { ...base, grade: "null", output: "raw.mp4" };
raw.timeline = base.timeline.map((e) => (e.src ? { ...e, grade: undefined } : e));
fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(raw, null, 1));
execFileSync("node", [path.join(__dirname, "render.js"), dir], { stdio: "inherit", env: process.env });

function luma(file, a, b) {
  const vals = [];
  for (let k = 0; k < 6; k++) {
    const f = Math.floor(a + ((b - a) * (k + 0.5)) / 6);
    const r = spawnSync(FFMPEG, ["-v", "error", "-i", path.join(dir, file), "-vf", `select='eq(n\\,${f})',${crop},signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`, "-an", "-f", "null", "-"], { encoding: "utf8" });
    const m = /YAVG=([0-9.]+)/.exec(r.stdout);
    if (m) vals.push(+m[1]);
  }
  return vals.reduce((x, y) => x + y, 0) / (vals.length || 1);
}

let at = 0;
const out = base.timeline.map((e) => {
  const len = e.keep ? e.keep[1] - e.keep[0] : e.frames;
  const a = at;
  at += len;
  if (!e.src) return e;
  const t = luma(base.inspo, a, at), m = luma("raw.mp4", a, at);
  const g = Math.max(0.42, Math.min(1.2, Math.log(Math.max(m, 1) / 255) / Math.log(Math.max(t, 1) / 255)));
  console.log(`slot ${a}-${at}: inspo ${t.toFixed(0)}, raw ${m.toFixed(0)}, gamma ${g.toFixed(2)}`);
  return { ...e, grade: `eq=gamma=${g.toFixed(2)}:contrast=1.05,unsharp=5:5:0.4` };
});
fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify({ ...base, timeline: out }, null, 1));
console.log("plan.json updated; now run render.js");
