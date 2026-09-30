// Fingerprint of everything that decides what ends up in frame: size, band and,
// per source shot, src/start/frames/cx/cy/side/band. Shared by preview.js
// (writes preview.stamp) and render.js (refuses to render if it doesn't match).
const crypto = require("crypto");

module.exports = (plan) => {
  const shots = plan.timeline
    .filter((e) => e.src && !e.image)
    .map(({ src, start, frames, cx, cy, side, band }) => [src, start, frames, cx, cy, side ?? 1, band ?? null]);
  const key = JSON.stringify([plan.size, plan.band ?? null, shots]);
  return crypto.createHash("sha1").update(key).digest("hex");
};
