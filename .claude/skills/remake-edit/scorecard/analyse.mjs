// Runs a face photo through the live Casdey analysis, so the score card shows
// real numbers:  node analyse.mjs <photo.jpg>   (JPEG, about 1280 px)
// It posts as the Resend test inbox with source "test"; afterwards delete the
// row (Supabase `analyses`, source = 'test') so it doesn't count as a lead.
import fs from "fs";

const photo = process.argv[2];
if (!photo) { console.log("usage: node analyse.mjs <photo.jpg>"); process.exit(1); }
const response = await fetch("https://www.casdey.com/api/analysis", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "delivered@resend.dev", adult: true, website: "", source: "test",
    answers: { goal: "everything", age: "26-30", training: "3-4", sleep: "7-8", skincare: "some", skin: "none", hair: "happy", style: "decent", blocker: "consistency" },
    body: { units: "metric", height: 180, weight: 78 },
    face: "data:image/jpeg;base64," + fs.readFileSync(photo).toString("base64"),
  }),
});
const body = await response.json();
console.log(JSON.stringify(body, null, 2));
if (body.score) console.log(`\n--score ${body.score} --potential ${body.potential}`);
