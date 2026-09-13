/**
 * Renders casdey's Instagram carousels to PNG, in brand v4 ("Chalk & Struck
 * Gold", brand assets/casdey-brand-guide.html), for the content plan in
 * content-plan.md at the repo root.
 *
 *   node scripts/instagram-render.mjs [batch] [post id ...]
 *   npm run ig:render -- batch-01 001 002
 *
 * Reads content/instagram/<batch>.json and writes one 1080x1350 (4:5) PNG per
 * slide to content/instagram/out/<post id>/<n>.png. The out/ folder is
 * gitignored: the JSON is the source, the images are rebuilt from it.
 *
 * Slide types: hook, text, stat, message, cta. In any title, [[words]] get the
 * Leaf highlight bar, the one gold accent a slide is allowed; in a message,
 * [brackets] mark the parts a gym fills in.
 *
 * A post with a `reel` instead of `slides` renders to out/<post id>/reel.mp4
 * (1080x1920, H.264 + AAC) and cover.jpg, drawn by scripts/instagram-reel.html:
 * `pov` puts text over a stock clip from content/instagram/footage/ (gitignored,
 * each clip's Pexels page is in the post's `source`), `demo` draws casdey's own
 * UI. Encoded frame by frame with WebCodecs in headless Chrome, so no ffmpeg.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const contentDir = path.join(repoRoot, "content", "instagram");

const [batchArg = "batch-01", ...onlyIds] = process.argv.slice(2);
const batchFile = batchArg.endsWith(".json") ? path.resolve(batchArg) : path.join(contentDir, `${batchArg}.json`);
const batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
const posts = batch.posts.filter((post) => onlyIds.length === 0 || onlyIds.includes(post.id));

const escape = (text = "") =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rich = (text) => escape(text).replace(/\[\[(.+?)\]\]/g, "<mark>$1</mark>").replace(/\n/g, "<br>");
const paragraphs = (text = "") =>
  text
    .split("\n")
    .map((line) => `<p>${escape(line)}</p>`)
    .join("");
const fillIns = (text) => escape(text).replace(/\[(.+?)\]/g, '<span class="fill">[$1]</span>');

// The v4 mark: four bars pinwheeled round an open centre, the top one Leaf.
// Same geometry as web/src/components/wordmark.tsx.
const MARK = `<svg viewBox="0 0 100 100" aria-hidden="true" fill="currentColor">
  <rect x="12" y="12" width="44" height="22" rx="11" fill="#D4AF37"/>
  <rect x="12" y="12" width="44" height="22" rx="11" transform="rotate(90 50 50)"/>
  <rect x="12" y="12" width="44" height="22" rx="11" transform="rotate(180 50 50)"/>
  <rect x="12" y="12" width="44" height="22" rx="11" transform="rotate(270 50 50)"/>
</svg>`;

const CSS = `
:root {
  --chalk: #F7F7F4;      /* the ground */
  --ink: #15150F;        /* headlines, 17:1 on Chalk */
  --ink-soft: #4A4A40;   /* body copy */
  --struck: #8F6A10;     /* gold you READ: eyebrows, small text, 4.6:1 */
  --leaf: #D4AF37;       /* gold you FILL: the highlight bar and the progress bar */
  --deep: #16160F;       /* the one inverted plane, the closing slide */
  --line: #E2E1D8;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1350px; }
body { background: var(--chalk); color: var(--ink); font-family: "IBM Plex Sans", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.slide { position: relative; width: 1080px; height: 1350px; padding: 92px 96px 150px; display: flex; flex-direction: column; overflow: hidden; }

.lockup { display: flex; align-items: center; gap: 14px; font-family: "Outfit", sans-serif; font-weight: 600; font-size: 38px; letter-spacing: -0.01em; }
.lockup svg { width: 35px; height: 35px; }

.main { margin: auto 0; }
.eyebrow { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 26px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--struck); margin-bottom: 36px; }

h1, h2, .big, .label { font-family: "Outfit", sans-serif; color: var(--ink); text-wrap: balance; }
p { text-wrap: pretty; }
h1 { font-weight: 700; font-size: 112px; line-height: 1.0; letter-spacing: -0.04em; }
h2 { font-weight: 600; font-size: 84px; line-height: 1.04; letter-spacing: -0.035em; }
.sub { margin-top: 48px; font-size: 42px; line-height: 1.42; color: var(--ink-soft); max-width: 820px; }
.body { margin-top: 44px; max-width: 860px; }
.body p { font-size: 44px; line-height: 1.45; color: var(--ink-soft); }
.body p + p { margin-top: 26px; }

/* The highlight: a Leaf bar with the mark's fully rounded ends, set under the
   lower half of the words so the ink still reads at 17:1 on top of it. */
mark { position: relative; background: none; color: inherit; white-space: nowrap; z-index: 0; }
mark::before { content: ""; position: absolute; left: -0.08em; right: -0.08em; bottom: 0.04em; height: 0.4em; border-radius: 999px; background: var(--leaf); z-index: -1; }

.big { font-weight: 700; font-size: 330px; line-height: 0.86; letter-spacing: -0.06em; }
.big.long { font-size: 230px; }
.label { font-weight: 600; font-size: 64px; letter-spacing: -0.03em; margin-top: 18px; }

.bubble { background: #FFFFFF; border: 2px solid var(--line); border-radius: 40px; padding: 60px 64px; box-shadow: 0 2px 0 rgba(21,21,15,0.03), 0 24px 60px -30px rgba(90,70,20,0.18); }
.bubble p { font-size: 41px; line-height: 1.5; color: var(--ink); }
.bubble p + p { margin-top: 24px; }
.fill { font-family: "IBM Plex Mono", monospace; font-size: 0.86em; color: var(--struck); }

.progress { position: absolute; left: 96px; bottom: 80px; display: flex; gap: 12px; }
.progress i { display: block; width: 46px; height: 14px; border-radius: 7px; background: rgba(21,21,15,0.13); }
.progress i.on { background: var(--leaf); }
.cue { position: absolute; right: 96px; bottom: 70px; font-family: "IBM Plex Mono", monospace; font-size: 26px; letter-spacing: 0.06em; color: var(--struck); }

/* The closing slide is the inverted plane. Everything that was ink remaps. */
.deep { background: var(--deep); color: #F7F7F4; }
.deep h2 { color: #F7F7F4; }
/* On the dark plane a half-height bar would leave chalk letters half on gold,
   so the bar grows to the full word and the words go near-black on Leaf, the
   pairing the brand guide allows (8.7:1). */
.deep mark { color: var(--deep); padding: 0 0.16em; margin: 0 0.04em; }
.deep mark::before { left: 0; right: 0; bottom: -0.2em; height: 1.16em; border-radius: 0.24em; }
.deep .body p { color: #D9D6C9; }
.deep .progress i { background: rgba(247,247,244,0.18); }
.deep .progress i.on { background: var(--leaf); }
`;

/**
 * The three brand faces, inlined as data URIs. Headless Chrome timed out
 * fetching Google Fonts itself (2026-09-13) while a plain fetch from Node got
 * them in under a second, so Node fetches them once, caches the result next to
 * the renders, and every slide loads with no network at all.
 */
async function fontCss() {
  // Inter is for reel text only: the plain sans a post typed on a phone reads as.
  const cache = path.join(contentDir, "out", ".fonts-v2.css");
  if (fs.existsSync(cache)) return fs.readFileSync(cache, "utf8");
  const url =
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500&family=Inter:wght@600;700&family=Outfit:wght@600;700&display=block";
  // A modern browser user agent, or Google serves TTF instead of woff2.
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
  let css = await fetch(url, { headers: { "user-agent": ua } }).then((r) => r.text());
  // Latin and latin-ext only: the posts never need Cyrillic, Greek or Vietnamese.
  css = css
    .split("/* ")
    .filter((block, i) => i === 0 || /^latin(-ext)? \*\//.test(block))
    .map((block, i) => (i === 0 ? block : `/* ${block}`))
    .join("");
  for (const fontUrl of new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) ?? [])) {
    const bytes = Buffer.from(await fetch(fontUrl).then((r) => r.arrayBuffer()));
    css = css.split(fontUrl).join(`data:font/woff2;base64,${bytes.toString("base64")}`);
  }
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.writeFileSync(cache, css);
  return css;
}
const FONTS = await fontCss();

function slideHtml(slide, index, total) {
  const last = index === total - 1;
  const eyebrow = slide.eyebrow ? `<div class="eyebrow">${escape(slide.eyebrow)}</div>` : "";
  let main;
  switch (slide.type) {
    case "hook":
      main = `${eyebrow}<h1>${rich(slide.title)}</h1>${slide.sub ? `<div class="sub">${rich(slide.sub)}</div>` : ""}`;
      break;
    case "stat":
      main = `${eyebrow}<div class="big${slide.big.length > 3 ? " long" : ""}">${escape(slide.big)}</div><div class="label">${escape(slide.label)}</div>${
        slide.body ? `<div class="body">${paragraphs(slide.body)}</div>` : ""
      }`;
      break;
    case "message":
      main = `${eyebrow}<div class="bubble">${slide.lines.map((line) => `<p>${fillIns(line)}</p>`).join("")}</div>`;
      break;
    case "text":
    case "cta":
      main = `${eyebrow}<h2>${rich(slide.title)}</h2>${slide.body ? `<div class="body">${paragraphs(slide.body)}</div>` : ""}`;
      break;
    default:
      throw new Error(`unknown slide type: ${slide.type}`);
  }
  const bars = Array.from({ length: total }, (_, i) => `<i class="${i === index ? "on" : ""}"></i>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${FONTS}</style><style>${CSS}</style></head><body>
<div class="slide${slide.type === "cta" ? " deep" : ""}">
  <div class="lockup">${MARK}<span>casdey</span></div>
  <div class="main">${main}</div>
  <div class="progress">${bars}</div>
  ${last ? "" : '<div class="cue">swipe →</div>'}
</div></body></html>`;
}

async function launch() {
  // A reel encode is one long evaluate call, well past puppeteer's 3-minute default.
  const options = { headless: true, protocolTimeout: 900_000 };
  try {
    return await puppeteer.launch(options);
  } catch (error) {
    // Fall back to an installed Chrome if puppeteer's own browser was never downloaded.
    const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"].find((p) => fs.existsSync(p));
    if (!chrome) throw error;
    return puppeteer.launch({ ...options, executablePath: chrome });
  }
}

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
const problems = [];
for (const post of posts.filter((p) => !p.reel)) {
  const dir = path.join(contentDir, "out", post.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [index, slide] of post.slides.entries()) {
    await page.setContent(slideHtml(slide, index, post.slides.length), { waitUntil: "load", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    // Catch copy that no longer fits: the main block must end above the progress bar.
    const overflow = await page.evaluate(() => {
      const main = document.querySelector(".main").getBoundingClientRect();
      const bars = document.querySelector(".progress").getBoundingClientRect();
      return main.bottom > bars.top - 40 || document.querySelector(".slide").scrollHeight > 1350;
    });
    if (overflow) problems.push(`${post.id} slide ${index + 1} overflows`);
    await page.screenshot({ path: path.join(dir, `${index + 1}.png`) });
  }
  console.log(`${post.id}: ${post.slides.length} slides -> ${path.relative(repoRoot, dir)}`);
}

const reels = posts.filter((p) => p.reel);
if (reels.length) {
  const footageDir = path.join(contentDir, "footage");
  const musicDir = path.join(contentDir, "music");
  let sink = null;
  const reelPage = await browser.newPage();
  reelPage.on("pageerror", (error) => console.error("[reel page]", error.message));
  await reelPage.exposeFunction("__chunk", (b64) => fs.appendFileSync(sink, Buffer.from(b64, "base64")));
  // Clips and tracks travel as bytes into the page: a file:// video drawn to a
  // canvas taints it, and a tainted canvas cannot be encoded.
  await reelPage.exposeFunction("__asset", (kind, name) => fs.readFileSync(path.join(kind === "music" ? musicDir : footageDir, name)).toString("base64"));
  await reelPage.goto(pathToFileURL(path.join(here, "instagram-reel.html")).href);
  await reelPage.addStyleTag({ content: FONTS });
  await reelPage.addScriptTag({ path: path.join(here, "..", "node_modules", "mp4-muxer", "build", "mp4-muxer.js") });

  for (const post of reels) {
    if (post.reel.clip && !fs.existsSync(path.join(footageDir, post.reel.clip))) {
      throw new Error(`${post.id}: missing content/instagram/footage/${post.reel.clip}, download it from ${post.reel.source ?? "its Pexels page"}`);
    }
    if (post.reel.music && !fs.existsSync(path.join(musicDir, post.reel.music))) {
      throw new Error(`${post.id}: missing content/instagram/music/${post.reel.music}, get it from ${post.reel.musicSource ?? "its library page"}`);
    }
    const dir = path.join(contentDir, "out", post.id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    sink = path.join(dir, "reel.mp4.part");
    fs.writeFileSync(sink, Buffer.alloc(0));
    const started = Date.now();
    const result = await reelPage.evaluate((spec) => window.renderReel(spec), post.reel);
    fs.renameSync(sink, path.join(dir, "reel.mp4"));
    fs.writeFileSync(path.join(dir, "cover.jpg"), Buffer.from(result.cover.split(",")[1], "base64"));
    for (const problem of result.problems) problems.push(`${post.id} ${problem}`);
    const mb = (result.bytes / 1_000_000).toFixed(1);
    const sound = result.audio ? post.reel.music : "silent";
    console.log(`${post.id}: reel, ${post.reel.duration}s, ${sound}, ${mb} MB in ${Math.round((Date.now() - started) / 1000)}s -> ${path.relative(repoRoot, dir)}`);
  }
}
await browser.close();
if (problems.length) {
  console.error(`\nCopy does not fit:\n  ${problems.join("\n  ")}`);
  process.exitCode = 1;
}
