/**
 * Finishes the existing V1.2 /see film without changing its edit.
 *
 * The committed MP4 is treated as the master: each frame is sampled at its
 * existing timestamp and encoded with explicit frame timestamps. The closing
 * email CTA is removed from its otherwise empty field. Audio is retained at
 * the already-approved V1.2 level.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const source = path.join(webRoot, "public", "video", "casdey-promo.mp4");
const workDir = path.join(webRoot, ".promo-regrade");
const output = path.join(workDir, "casdey-promo-v1.2.mp4");
const poster = path.join(workDir, "casdey-promo-v1.2-poster.webp");
const html = path.join(here, "promo-regrade.html");
const muxer = path.join(webRoot, "node_modules", "mp4-muxer", "build", "mp4-muxer.js");

fs.mkdirSync(workDir, { recursive: true });

function sendFile(request, response, file, type) {
  const size = fs.statSync(file).size;
  const range = request.headers.range;
  if (range) {
    const [rawStart, rawEnd] = range.replace("bytes=", "").split("-");
    const start = Number(rawStart);
    const end = rawEnd ? Number(rawEnd) : size - 1;
    response.writeHead(206, {
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Type": type,
    });
    fs.createReadStream(file, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, { "Content-Length": size, "Content-Type": type });
  fs.createReadStream(file).pipe(response);
}

const server = http.createServer((request, response) => {
  if (request.url?.startsWith("/source.mp4")) return sendFile(request, response, source, "video/mp4");
  if (request.url === "/muxer.js") return sendFile(request, response, muxer, "text/javascript");
  return sendFile(request, response, html, "text/html; charset=utf-8");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Could not open the render server.");

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 1_800_000 });
const page = await browser.newPage();
page.on("pageerror", (error) => console.error("[promo regrade]", error.message));
await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: "networkidle0" });

let sink = `${output}.part`;
if (fs.existsSync(sink)) fs.unlinkSync(sink);
await page.exposeFunction("__chunk", (base64) => {
  fs.appendFileSync(sink, Buffer.from(base64, "base64"));
});
await page.exposeFunction("__progress", (frame, total) => {
  process.stdout.write(`\rFrames ${String(frame).padStart(4)} / ${total}`);
});

try {
  const started = Date.now();
  const result = await page.evaluate(() => window.renderRegrade({
    width: 1280,
    height: 720,
    fps: 30,
    codec: "avc1.64001f",
    videoBitrate: 1_650_000,
    audioBitrate: 192_000,
    posterTime: 67,
    closingStartsAt: 63,
    closingFadeSeconds: 0.5,
    closingGain: 1,
  }));
  fs.renameSync(sink, output);
  sink = null;
  fs.writeFileSync(poster, Buffer.from(result.poster.split(",")[1], "base64"));
  process.stdout.write("\n");
  console.log(
    `${result.frames} frames, ${result.duration.toFixed(3)}s, ` +
      `${result.sampleRate}Hz ${result.channels}-channel audio, ` +
      `${(result.bytes / 1_000_000).toFixed(1)} MB in ${Math.round((Date.now() - started) / 1000)}s`,
  );
  console.log(`Review output: ${path.relative(webRoot, output)}`);
} finally {
  if (sink && fs.existsSync(sink)) fs.unlinkSync(sink);
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
