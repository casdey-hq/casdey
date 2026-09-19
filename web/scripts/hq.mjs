/**
 * Writes casdey's business view in /admin (migration 0041). This is how a
 * Claude session, or the Sunday check-up routine, updates what Davide sees:
 * one command, shown the moment it is saved, with no document to push.
 *
 *   npm run hq -- <thing> <action> [...]
 *
 *   note get <key>
 *   note set <key> "<title>" <file.md>        (use - to read stdin)
 *   todo list [--all]
 *   todo add "<title>" [--detail "..."] [--link URL] [--due YYYY-MM-DD]
 *                      [--source manual|claude|checkup] [--proposed]
 *   todo done|dismiss|open <id>
 *   goal list
 *   goal add "<label>" [--metric engaged_rate_week|paying_gyms|reply_rate_week]
 *                      [--target N] [--unit percent|count] [--deadline YYYY-MM-DD] [--note "..."]
 *   goal close <id> hit|missed|retired
 *   inputs list
 *   inputs set <file.json>       [{ "owner": "davide|ai|together", "label": "..." }, ...]
 *   costs set <file.json>        [{ "service", "purpose", "monthly_eur", "basis", "when_it_matters" }, ...]
 *   checkup set <file.md> [--week YYYY-MM-DD]   this week's Sunday analysis (default: latest Sunday)
 *   checkup get                  the latest one
 *   summary                      everything written, for an agent starting a session
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment first
 * (a cloud routine) and web/.env.local otherwise (a local session).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const [thing, action, ...rest] = process.argv.slice(2);

/** --flag value pairs, plus bare --flags, plus positional arguments. */
function parse(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) flags[name] = true;
      else {
        flags[name] = next;
        i += 1;
      }
    } else positional.push(arg);
  }
  return { flags, positional };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function run(query) {
  const { data, error } = await query;
  if (error) fail(`${error.code ?? ""} ${error.message}`);
  return data;
}

function readInput(file) {
  if (!file) fail("Give a file, or - for stdin.");
  return file === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(file, "utf8");
}

const { flags, positional } = parse(rest);
const who = process.env.HQ_AUTHOR ?? "claude";

switch (`${thing} ${action}`) {
  case "note get": {
    const row = await run(db.from("hq_notes").select("*").eq("key", positional[0]).maybeSingle());
    console.log(row ? `# ${row.title}\n(updated ${row.updated_at} by ${row.updated_by})\n\n${row.body}` : "(none)");
    break;
  }
  case "note set": {
    const [noteKey, title, file] = positional;
    if (!noteKey || !title) fail('note set <key> "<title>" <file.md>');
    await run(
      db.from("hq_notes").upsert({
        key: noteKey,
        title,
        body: readInput(file),
        updated_at: new Date().toISOString(),
        updated_by: who,
      }),
    );
    console.log(`note ${noteKey} saved`);
    break;
  }
  case "todo list": {
    let query = db.from("hq_todos").select("*").order("created_at", { ascending: false });
    if (!flags.all) query = query.in("status", ["proposed", "open"]);
    for (const row of await run(query)) {
      console.log(`${row.id}  [${row.status}] ${row.title}${row.due ? `  (due ${row.due})` : ""}  <${row.source}>`);
    }
    break;
  }
  case "todo add": {
    const title = positional[0];
    if (!title) fail('todo add "<title>"');
    const row = await run(
      db
        .from("hq_todos")
        .insert({
          title,
          detail: flags.detail ?? null,
          link: flags.link ?? null,
          due: flags.due ?? null,
          source: flags.source ?? "claude",
          status: flags.proposed ? "proposed" : "open",
        })
        .select("id")
        .single(),
    );
    console.log(`todo ${row.id} added`);
    break;
  }
  case "todo done":
  case "todo dismiss":
  case "todo open": {
    const status = { done: "done", dismiss: "dismissed", open: "open" }[action];
    await run(
      db
        .from("hq_todos")
        .update({ status, closed_at: status === "open" ? null : new Date().toISOString() })
        .eq("id", positional[0]),
    );
    console.log(`todo ${positional[0]} ${status}`);
    break;
  }
  case "goal list": {
    for (const row of await run(db.from("hq_goals").select("*").order("set_at", { ascending: false }))) {
      console.log(`${row.id}  [${row.status}] ${row.label}${row.deadline ? `  by ${row.deadline}` : ""}${row.metric ? `  (${row.metric} ${row.target}${row.unit === "percent" ? "%" : ""})` : ""}`);
    }
    break;
  }
  case "goal add": {
    const label = positional[0];
    if (!label) fail('goal add "<label>"');
    const row = await run(
      db
        .from("hq_goals")
        .insert({
          label,
          metric: flags.metric ?? null,
          target: flags.target === undefined ? null : Number(flags.target),
          unit: flags.unit ?? null,
          deadline: flags.deadline ?? null,
          note: flags.note ?? null,
        })
        .select("id")
        .single(),
    );
    console.log(`goal ${row.id} added`);
    break;
  }
  case "goal close": {
    const [id, status] = positional;
    if (!["hit", "missed", "retired"].includes(status)) fail("goal close <id> hit|missed|retired");
    await run(db.from("hq_goals").update({ status, closed_at: new Date().toISOString() }).eq("id", id));
    console.log(`goal ${id} ${status}`);
    break;
  }
  case "inputs list": {
    for (const row of await run(db.from("hq_inputs").select("*").order("owner").order("position"))) {
      console.log(`${row.owner.padEnd(9)} ${row.label}`);
    }
    break;
  }
  case "inputs set": {
    const items = JSON.parse(readInput(positional[0]));
    await run(db.from("hq_inputs").delete().not("id", "is", null));
    await run(db.from("hq_inputs").insert(items.map((item, position) => ({ ...item, position }))));
    console.log(`${items.length} inputs saved`);
    break;
  }
  case "costs set": {
    const items = JSON.parse(readInput(positional[0]));
    await run(db.from("hq_costs").delete().not("id", "is", null));
    await run(db.from("hq_costs").insert(items.map((item, position) => ({ ...item, position }))));
    console.log(`${items.length} cost lines saved`);
    break;
  }
  case "checkup set": {
    // One note per week, keyed by that week's Sunday, so /admin's Check-up
    // tab keeps the history. The Sunday defaults to the most recent one
    // (today, on a Sunday).
    const week = flags.week ?? (() => {
      const now = new Date();
      return new Date(now.getTime() - now.getUTCDay() * 86_400_000).toISOString().slice(0, 10);
    })();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) fail("--week must be YYYY-MM-DD");
    const title = `Week of ${new Date(`${week}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`;
    const noteKey = `checkup_${week.replaceAll("-", "_")}`;
    await run(
      db.from("hq_notes").upsert({
        key: noteKey,
        title,
        body: readInput(positional[0]),
        updated_at: new Date().toISOString(),
        updated_by: who,
      }),
    );
    console.log(`check-up for ${week} saved (${noteKey})`);
    break;
  }
  case "checkup get": {
    const rows = await run(
      db.from("hq_notes").select("*").like("key", "checkup\\_%").order("key", { ascending: false }).limit(1),
    );
    console.log(rows[0] ? `# ${rows[0].title}\n\n${rows[0].body}` : "(no check-up yet)");
    break;
  }
  case "summary undefined":
  case "summary all": {
    // The written half of /admin in one read, for an agent starting a session
    // (AGENTS.md). Live numbers are not here: they come from Stripe, PostHog
    // and the leads sheet, via the check-up scripts or /admin itself.
    const [goals, todos, notes, inputs, costs] = await Promise.all([
      run(db.from("hq_goals").select("*").eq("status", "active").order("set_at")),
      run(db.from("hq_todos").select("*").in("status", ["proposed", "open"]).is("signal_key", null).order("created_at")),
      run(db.from("hq_notes").select("*").order("key")),
      run(db.from("hq_inputs").select("*").order("owner").order("position")),
      run(db.from("hq_costs").select("*").order("position")),
    ]);
    const out = [];
    out.push("# casdey HQ (written half of /admin, read " + new Date().toISOString().slice(0, 16) + "Z)\n");
    out.push("## Goals");
    for (const g of goals) out.push(`- ${g.label}${g.deadline ? ` (by ${g.deadline})` : ""}${g.note ? `. ${g.note}` : ""}`);
    out.push("\n## Open to-dos (live signals are computed in /admin and not listed here)");
    for (const t of todos) out.push(`- [${t.status}] ${t.title}${t.due ? ` (due ${t.due})` : ""}${t.detail ? `: ${t.detail}` : ""}`);
    out.push("\n## Who does what");
    for (const owner of ["davide", "ai", "together"]) {
      out.push(`- ${owner}: ${inputs.filter((i) => i.owner === owner).map((i) => i.label).join("; ")}`);
    }
    const fixed = costs.reduce((sum, c) => sum + Number(c.monthly_eur), 0);
    out.push(`\n## Fixed monthly cost: EUR ${fixed.toFixed(2)} (${costs.filter((c) => Number(c.monthly_eur) > 0).map((c) => `${c.service} ${c.monthly_eur}`).join(", ")})`);
    // Only the latest check-up: earlier weeks are history, on /admin.
    const checkups = notes.filter((n) => n.key.startsWith("checkup_")).sort((a, b) => b.key.localeCompare(a.key));
    const shown = notes.filter((n) => !n.key.startsWith("checkup_")).concat(checkups.slice(0, 1));
    for (const n of shown) out.push(`\n## ${n.title} [note: ${n.key}, updated ${n.updated_at.slice(0, 10)} by ${n.updated_by}]\n\n${n.body}`);
    console.log(out.join("\n"));
    break;
  }
  default:
    fail(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
}
