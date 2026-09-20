import "server-only";

import { supabaseAdmin } from "./supabase";
import type { GoalRef, Signal, TrialEnding } from "./hq-signals";

/**
 * Reads casdey's own business view (migration 0041) for /admin. Everything
 * here is written by Davide in /admin or by Claude with scripts/hq.mjs, and
 * shown as soon as it is saved.
 */

export type HqNote = {
  key: string;
  title: string;
  body: string;
  updated_at: string;
  updated_by: string;
};

export type HqInput = { id: string; owner: "davide" | "ai" | "together"; label: string };

export type HqGoal = GoalRef & {
  metric: "engaged_rate_week" | "paying_gyms" | "reply_rate_week" | null;
  target: number | null;
  unit: "percent" | "count" | null;
  note: string | null;
  set_at: string;
};

export type HqTodo = {
  id: string;
  title: string;
  detail: string | null;
  link: string | null;
  source: "manual" | "claude" | "checkup" | "signal";
  status: "proposed" | "open" | "done" | "dismissed";
  signal_key: string | null;
  due: string | null;
  created_at: string;
  closed_at: string | null;
};

export type HqCost = {
  id: string;
  service: string;
  purpose: string;
  monthly_eur: number;
  basis: string | null;
  when_it_matters: string | null;
};

export type HqData = {
  notes: Record<string, HqNote>;
  /** Sunday check-ups, newest first. Stored as notes keyed checkup_<sunday>. */
  checkups: HqNote[];
  /**
   * What each Sunday review with Davide DECIDED, newest first, keyed
   * review_<sunday>. Kept apart from the check-up on purpose (Davide,
   * 2026-09-20): the check-up is the analysis, written unattended before he
   * is awake, and writing the decisions over it destroys what they were
   * decided from.
   */
  reviews: HqNote[];
  inputs: HqInput[];
  goals: HqGoal[];
  todos: HqTodo[];
  costs: HqCost[];
  trialsEnding: TrialEnding[];
};

/** How far ahead a first week ending is worth a to-do. */
const TRIAL_WARNING_DAYS = 7;

export async function readHq(now: Date = new Date()): Promise<HqData> {
  const db = supabaseAdmin();
  const soon = new Date(now.getTime() + TRIAL_WARNING_DAYS * 86_400_000).toISOString();
  // Closed to-dos matter for two things only: keeping ticked signals ticked,
  // and a short "recently done" list. Thirty days covers both.
  const recent = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const [notes, inputs, goals, todos, costs, trials] = await Promise.all([
    db.from("hq_notes").select("*"),
    db.from("hq_inputs").select("id, owner, label").order("position"),
    db.from("hq_goals").select("*").order("set_at", { ascending: false }),
    db
      .from("hq_todos")
      .select("*")
      .or(`status.in.(proposed,open),closed_at.gte.${recent}`)
      .order("created_at", { ascending: false }),
    db.from("hq_costs").select("*").order("position"),
    // Real gyms only: a first week ending on a test gym is not a to-do.
    db
      .from("gyms")
      .select("id, name, trial_ends_at")
      .eq("is_internal", false)
      .is("trial_converted_at", null)
      .is("trial_closed_at", null)
      .gte("trial_ends_at", now.toISOString())
      .lte("trial_ends_at", soon),
  ]);

  for (const [name, result] of Object.entries({ notes, inputs, goals, todos, costs, trials })) {
    if (result.error) console.error(`[hq] ${name} read failed`, result.error.message);
  }

  return {
    notes: Object.fromEntries(
      ((notes.data ?? []) as HqNote[]).map((note) => [note.key, note]),
    ),
    checkups: ((notes.data ?? []) as HqNote[])
      .filter((note) => note.key.startsWith("checkup_"))
      .sort((a, b) => b.key.localeCompare(a.key)),
    reviews: ((notes.data ?? []) as HqNote[])
      .filter((note) => note.key.startsWith("review_"))
      .sort((a, b) => b.key.localeCompare(a.key)),
    inputs: (inputs.data ?? []) as HqInput[],
    goals: ((goals.data ?? []) as HqGoal[]).map((goal) => ({
      ...goal,
      target: goal.target === null ? null : Number(goal.target),
    })),
    todos: (todos.data ?? []) as HqTodo[],
    costs: ((costs.data ?? []) as HqCost[]).map((cost) => ({
      ...cost,
      monthly_eur: Number(cost.monthly_eur),
    })),
    trialsEnding: ((trials.data ?? []) as { id: string; name: string; trial_ends_at: string }[]).map(
      (gym) => ({ gymId: gym.id, gymName: gym.name, endsAt: gym.trial_ends_at }),
    ),
  };
}

export type SignalState = { status: HqTodo["status"]; firstSeen: string };

/**
 * Records each live signal the first time it is seen, and reads back what is
 * known about the ones on screen now: when it first appeared (the "added"
 * date Davide sees) and whether he has ticked or dismissed it.
 *
 * Insert-if-missing, so a signal's first-seen date never moves and a tick is
 * never undone by a later load. Looked up by the keys on screen rather than
 * by date, so a signal ticked months ago stays ticked.
 */
export async function syncSignals(
  signals: Pick<Signal, "key" | "title" | "due">[],
): Promise<Map<string, SignalState>> {
  const states = new Map<string, SignalState>();
  if (signals.length === 0) return states;
  const db = supabaseAdmin();

  const { error: insertError } = await db.from("hq_todos").upsert(
    signals.map((signal) => ({
      signal_key: signal.key,
      title: signal.title.slice(0, 300),
      due: signal.due,
      source: "signal",
      status: "open",
    })),
    { onConflict: "signal_key", ignoreDuplicates: true },
  );
  if (insertError) console.error("[hq] signal record failed", insertError.message);

  const { data, error } = await db
    .from("hq_todos")
    .select("signal_key, status, created_at")
    .in("signal_key", signals.map((signal) => signal.key));
  if (error) console.error("[hq] signal read failed", error.message);

  for (const row of (data ?? []) as { signal_key: string; status: HqTodo["status"]; created_at: string }[]) {
    states.set(row.signal_key, { status: row.status, firstSeen: row.created_at });
  }
  return states;
}
