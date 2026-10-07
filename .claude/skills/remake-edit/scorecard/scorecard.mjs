// The Casdey score card (2026-10-07), the CTA clip that replaced endcard.js.
// Modelled on the PSL App edits: the edit dissolves into a dark card where the
// subject's face pops in, the score and the 90-day potential count up, the
// potential tile glows, and "Get yours free · casdey.com" rises in.
//
//   node scorecard.mjs <edit.mp4> --face <square face.jpg> --score 8.2 --potential 9.2
//                      --at <seconds, a cut/beat> [--cta casdey.com] [--out x.mp4]
//
// Get the numbers from the real analysis first (analyse.mjs), never invent
// them. The card plays from --at to the end of the edit over the edit's own
// audio; it needs about 2.2 s to finish building, so pick a beat at least that
// far from the end. Frames are rendered by headless Edge through capture.mjs
// (smooth sub-pixel motion, transparent background), then overlaid with ffmpeg.
// Needs FFMPEG=path\to\ffmpeg.exe (ffprobe next to it).
import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const face = opt("--face");
const score = Number(opt("--score"));
const potential = Number(opt("--potential"));
const at = Number(opt("--at"));
const cta = opt("--cta", "casdey.com");
// "over" (default, Davide 2026-10-07): the edit keeps playing under the card,
// blurred and dimmed, so the song and the motion carry on. "solid" is the old
// near-black wash.
const mode = opt("--mode", "over");
const edit = path.resolve(args.find((a) => !a.startsWith("--")) || "");
const out = path.resolve(opt("--out", edit.replace(/\.mp4$/i, "_card.mp4")));
if (!fs.existsSync(edit) || !face || !(score > 0) || !(potential >= score) || !(at >= 0)) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(0, 14).join("\n"));
  process.exit(1);
}
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const probe = (entries) => execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", entries, "-of", "csv=p=0", edit]).toString().trim();
const duration = Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", edit]).toString().trim());
// Render the card at the edit's own frame rate (60 fps edits looked choppy at 30).
const [rn, rd] = probe("stream=r_frame_rate").split("/").map(Number);
const fps = Math.round(rn / (rd || 1)) || 30;
const secs = duration - at;
if (secs < 2.2) console.warn(`only ${secs.toFixed(2)} s for the card: it may not finish building; pick an earlier beat`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "scorecard-"));
const faceUrl = "data:image/jpeg;base64," + fs.readFileSync(face).toString("base64");
const html = fs.readFileSync(path.join(here, "template.html"), "utf8")
  .replace("__FACE__", faceUrl)
  .replace("__SCORE__", String(score))
  .replace("__POT__", String(potential))
  .replace("__CTA__", cta)
  .replace("__BGA__", mode === "solid" ? "0.97" : "0.55");
fs.writeFileSync(path.join(tmp, "card.html"), html);

let r = spawnSync(process.execPath, [path.join(here, "capture.mjs"), path.join(tmp, "card.html"), path.join(tmp, "frames"), String(secs.toFixed(3)), String(fps)], { stdio: "inherit" });
if (r.status) throw new Error("capture failed");

r = spawnSync(FFMPEG, ["-v", "error", "-y", "-i", edit, "-framerate", String(fps), "-i", path.join(tmp, "frames", "%04d.png"),
  "-filter_complex", (mode === "solid" ? `[0:v]null[base];` : `[0:v]split[a][b];[b]trim=start=${at},setpts=PTS-STARTPTS,gblur=sigma=30,format=rgba,fade=t=in:st=0:d=0.35:alpha=1,setpts=PTS+${at}/TB[bl];[a][bl]overlay=0:0:eof_action=pass[base];`) + `[1:v]format=rgba,setpts=PTS-STARTPTS+${at}/TB[c];[base][c]overlay=0:0:eof_action=repeat,format=yuv420p[v]`,
  "-map", "[v]", "-map", "0:a?", "-t", String(duration), "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-tune", "film", "-c:a", "copy", "-movflags", "+faststart", out]);
if (r.status) throw new Error(r.stderr.toString());
// Edge can hold its profile for a moment after exiting; cleanup is best effort.
try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
console.log(`${out}: ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
