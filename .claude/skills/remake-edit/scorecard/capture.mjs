// Renders anim.html frame by frame through headless Edge (Chrome DevTools
// Protocol) with a transparent background: node capture.mjs <html> <outdir> <seconds> [fps]
import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
const [html, outDir, secs, fpsArg] = process.argv.slice(2);
const fps = Number(fpsArg || 30), frames = Math.round(Number(secs) * fps);
fs.mkdirSync(outDir, { recursive: true });
const port = 9333 + Math.floor(Math.random() * 500);
const profile = path.resolve(outDir, "..", "edge-cdp-" + port);
const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 100; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.find((t) => t.type === "page")) break; } catch {} await sleep(200); }
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (m) => (m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
await send("Page.navigate", { url: pathToFileURL(path.resolve(html)).href });
await sleep(1500);
for (let f = 0; f < frames; f++) {
  await send("Runtime.evaluate", { expression: `render(${f / fps})` });
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(outDir, String(f).padStart(4, "0") + ".png"), Buffer.from(data, "base64"));
}
ws.close(); spawnSync("taskkill", ["/PID", String(edge.pid), "/T", "/F"]);
console.log(frames + " frames");
