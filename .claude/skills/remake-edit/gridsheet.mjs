// node gridsheet.mjs <out.jpg> <cols> <tile px> <file...>  -> labelled contact sheet via xstack (no image2 sequences)
import { spawnSync } from "child_process";
const [out, colsArg, tileArg, ...files] = process.argv.slice(2);
const cols = Number(colsArg), T = Number(tileArg);
const FF = process.env.FFMPEG || "ffmpeg";
const args = ["-v", "error", "-y"];
files.forEach((f) => args.push("-i", f));
const lab = (f) => f.replace(/^.*[\/]/, "").replace(/\.[a-z]+$/i, "");
const chains = files.map((f, i) => `[${i}:v]scale=${T}:${T}:force_original_aspect_ratio=increase,crop=${T}:${T},drawtext=fontfile='/Windows/Fonts/arialbd.ttf':text='${lab(f)}':x=3:y=3:fontsize=${Math.round(T / 10)}:fontcolor=yellow:box=1:boxcolor=black[v${i}]`);
const layout = files.map((_, i) => `${(i % cols) * T}_${Math.floor(i / cols) * T}`).join("|");
const graph = chains.join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") + `xstack=inputs=${files.length}:layout=${layout}[o]`;
args.push("-filter_complex", graph, "-map", "[o]", "-frames:v", "1", "-q:v", "3", out);
const r = spawnSync(FF, args);
if (r.status) { console.error(r.stderr.toString().slice(-400)); process.exit(1); }
console.log("ok", files.length);
