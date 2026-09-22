import { Card, CardTitle } from "@/components/app/ui";
import { mrr } from "@/lib/admin-stats";
import { readHq, syncSignals, type HqGoal, type HqTodo } from "@/lib/hq";
import { liveSignals } from "@/lib/hq-signals";
import { marketingSummary } from "@/lib/marketing-stats";
import type { MarketingSummary } from "@/lib/marketing-summary";
import Link from "next/link";

import { AddTodoForm, TodoList, type TodoItem } from "./hq-client";
import { Section } from "./parts";

/**
 * Today: what needs doing, how the goals stand, and who does what.
 *
 * To-dos come from three places (IMPROVEMENTS.md #4): live signals worked out
 * from the business on this load (src/lib/hq-signals.ts), the Sunday
 * check-up's proposals waiting to be accepted, and anything added by hand or
 * by Claude. A signal Davide has ticked stays ticked by its key.
 */

const ORIGIN: Record<HqTodo["source"], string> = {
  manual: "You",
  claude: "Claude",
  checkup: "Sunday check-up",
  signal: "Live",
};

const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const OWNER_TITLES = {
  davide: "Your inputs",
  ai: "AI inputs",
  together: "Together",
} as const;

export async function TodayTab() {
  const now = new Date();
  const [hq, marketing, revenue] = await Promise.all([
    readHq(now),
    marketingSummary(),
    mrr(),
  ]);

  const computed = liveSignals({
    marketing,
    trialsEnding: hq.trialsEnding,
    goals: hq.goals,
    now,
  });
  // Records first sightings (the "added" date) and reads back ticks.
  const states = await syncSignals(computed);
  const signals = computed.filter(
    (signal) => (states.get(signal.key)?.status ?? "open") === "open",
  );

  const open = hq.todos.filter((todo) => todo.status === "open" && !todo.signal_key);
  const proposed = hq.todos.filter((todo) => todo.status === "proposed");
  const recentlyDone = hq.todos
    .filter((todo) => todo.status === "done" && todo.closed_at)
    .filter((todo) => now.getTime() - Date.parse(todo.closed_at!) < 7 * 86_400_000)
    .slice(0, 8);

  const toItem = (todo: HqTodo): TodoItem => ({
    ref: todo.id,
    kind: "todo",
    title: todo.title,
    detail: todo.detail,
    link: todo.link,
    origin: ORIGIN[todo.source],
    added: shortDate(todo.created_at),
    due: todo.due ? shortDate(todo.due) : null,
    proposed: todo.status === "proposed",
  });

  // Live signals first (they are about today), then everything written down,
  // soonest due first.
  const items: TodoItem[] = [
    ...signals.map((signal) => ({
      ref: signal.key,
      kind: "signal" as const,
      title: signal.title,
      detail: signal.detail,
      link: signal.link,
      origin: "Live",
      added: states.get(signal.key) ? shortDate(states.get(signal.key)!.firstSeen) : null,
      due: signal.due ? shortDate(signal.due) : null,
      proposed: false,
    })),
    ...open
      .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
      .map(toItem),
  ];

  const latest = hq.checkups[0] ?? null;

  return (
    <>
      <Section
        title="To do"
        sub="Live items appear when something needs you and disappear when it is dealt with. Tick anything off once it is done."
      >
        <TodoList items={items} empty="Nothing needs you right now." />
        <AddTodoForm />
      </Section>

      <Link
        href="/admin?tab=checkup"
        className="card mt-8 flex flex-wrap items-center justify-between gap-3 p-5 transition-colors duration-150 hover:border-teal"
      >
        <span>
          <span className="label block text-stone">Sunday check-up</span>
          <span className="mt-1 block text-[0.9375rem] font-semibold text-ink">
            {latest ? latest.title : "The first one arrives on Sunday morning"}
          </span>
        </span>
        <span className="text-[0.875rem] font-semibold text-teal">
          {proposed.length > 0
            ? `${proposed.length} proposal${proposed.length === 1 ? "" : "s"} to review →`
            : "Open →"}
        </span>
      </Link>

      <Section title="Goals" sub="Set in the Sunday review. Progress is live where casdey can measure it.">
        {hq.goals.filter((goal) => goal.status === "active").length === 0 ? (
          <p className="text-[0.875rem] text-stone">No active goals. Set the next ones in the Sunday review.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {hq.goals
              .filter((goal) => goal.status === "active")
              .map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  marketing={marketing}
                  payingGyms={revenue.payingGyms}
                  now={now}
                />
              ))}
          </div>
        )}
      </Section>

      <Section title="Who does what" sub="Update these whenever the split changes.">
        <div className="grid gap-4 md:grid-cols-3">
          {(["davide", "ai", "together"] as const).map((owner) => (
            <Card key={owner}>
              <CardTitle>{OWNER_TITLES[owner]}</CardTitle>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-graphite">
                {hq.inputs
                  .filter((input) => input.owner === owner)
                  .map((input) => (
                    <li key={input.id}>{input.label}</li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      {recentlyDone.length > 0 ? (
        <Section title="Done this week">
          <ul className="space-y-1.5 text-[0.875rem] text-stone">
            {recentlyDone.map((todo) => (
              <li key={todo.id}>
                <span className="text-teal">✓</span> {todo.title}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

function GoalCard({
  goal,
  marketing,
  payingGyms,
  now,
}: {
  goal: HqGoal;
  marketing: MarketingSummary | null;
  payingGyms: number;
  now: Date;
}) {
  const current =
    goal.metric === "paying_gyms"
      ? payingGyms
      : goal.metric === "engaged_rate_week"
        ? (marketing?.weekCohort.engagedRatePct ?? null)
        : goal.metric === "reply_rate_week"
          ? (marketing?.weekCohort.replyRatePct ?? null)
          : null;

  const show = (value: number) =>
    goal.unit === "percent"
      ? `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`
      : value.toLocaleString("en-GB");

  const progress =
    current !== null && goal.target ? Math.min(100, (current / goal.target) * 100) : null;
  // Whole calendar days, so a deadline of tomorrow reads "1 day left" at any
  // hour today.
  const daysLeft = goal.deadline
    ? Math.round(
        (Date.parse(`${goal.deadline}T00:00:00Z`) -
          Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`)) /
          86_400_000,
      )
    : null;

  const cohortLine =
    goal.metric === "engaged_rate_week" && marketing
      ? `${marketing.weekCohort.engaged} of ${marketing.weekCohort.contacted} gyms first contacted since Monday`
      : goal.metric === "reply_rate_week" && marketing
        ? `${marketing.weekCohort.replied} of ${marketing.weekCohort.contacted} gyms first contacted since Monday`
        : goal.metric === "paying_gyms"
          ? "Live from Stripe, test gyms excluded"
          : null;

  return (
    <Card>
      <p className="label text-stone">
        {goal.deadline
          ? daysLeft !== null && daysLeft >= 0
            ? `By ${shortDate(goal.deadline)} · ${daysLeft === 0 ? "ends today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}`
            : `Deadline ${shortDate(goal.deadline)} passed`
          : "No deadline"}
      </p>
      <p className="mt-1.5 text-[1.0625rem] font-semibold text-ink">{goal.label}</p>
      {current !== null && goal.target !== null ? (
        <>
          <p className="literal mt-3 text-[1.75rem] leading-none text-ink">
            {show(current)}
            <span className="text-[0.9375rem] text-stone"> of {show(goal.target)}</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ash">
            <div
              className="h-full rounded-full bg-teal"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </>
      ) : goal.metric ? (
        <p className="mt-3 text-[0.8125rem] text-stone">Not measurable right now (the leads sheet did not load).</p>
      ) : null}
      {cohortLine ? <p className="mt-2 text-[0.8125rem] text-stone">{cohortLine}</p> : null}
      {goal.note ? <p className="mt-2 text-[0.8125rem] text-stone">{goal.note}</p> : null}
    </Card>
  );
}
