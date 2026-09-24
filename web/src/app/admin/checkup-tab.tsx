import Link from "next/link";

import { Card } from "@/components/app/ui";
import { readHq, type HqTodo } from "@/lib/hq";
import { NoteEditor, TodoList, type TodoItem } from "./hq-client";
import { MarkdownLite } from "./markdown-lite";
import { Section } from "./parts";

/**
 * The Sunday check-up, one week at a time (IMPROVEMENTS.md #2, Davide's ask on
 * 2026-09-19 to be able to see it).
 *
 * Two notes a week, deliberately (Davide, 2026-09-20). The routine writes the
 * analysis as checkup_<sunday> (`npm run hq -- checkup set`) plus its
 * recommended actions as proposed to-dos, usually unattended at 02:00. The
 * Sunday session with Claude then writes what was DECIDED as its own note,
 * review_<sunday> (`npm run hq -- review set`), shown above the check-up and
 * never written over it: the analysis is the thing the decisions were made
 * from, so losing it loses the reasoning. This tab is where Davide reads both,
 * decides on the proposals, and can look back at earlier weeks. The numbers
 * behind it stay on the Numbers and Marketing tabs, live, rather than being
 * copied into the analysis where they would go stale.
 */

const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export async function CheckupTab() {
  const hq = await readHq();
  const [latest, ...earlier] = hq.checkups;
  const [decided, ...earlierReviews] = hq.reviews;

  const proposed: TodoItem[] = hq.todos
    .filter((todo) => todo.status === "proposed")
    .map((todo: HqTodo) => ({
      ref: todo.id,
      kind: "todo",
      title: todo.title,
      detail: todo.detail,
      link: todo.link,
      origin: "Sunday check-up",
      added: shortDate(todo.created_at),
      due: todo.due ? shortDate(todo.due) : null,
      dueRaw: todo.due,
      proposed: true,
    }));

  return (
    <>
      {decided ? (
        <Section
          title={decided.title}
          sub="What the Sunday session with Claude decided. The check-up it was decided from is below, untouched."
        >
          <Card>
            <NoteEditor noteKey={decided.key} body={decided.body}>
              <MarkdownLite source={decided.body} />
            </NoteEditor>
          </Card>
        </Section>
      ) : null}

      {latest ? (
        <Section
          title={latest.title}
          sub={`Written ${new Date(latest.updated_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}. The figures behind it are live on the Numbers and Marketing tabs.`}
        >
          <Card>
            <NoteEditor noteKey={latest.key} body={latest.body}>
              <MarkdownLite source={latest.body} />
            </NoteEditor>
          </Card>
        </Section>
      ) : (
        <Section title="No check-up yet">
          <Card>
            <p className="text-[0.9375rem] leading-relaxed text-graphite">
              The first one arrives on Sunday morning: the routine runs at 04:00
              Italy time, writes its analysis here, adds its proposals below, and
              emails you a short note with the link. You can also run{" "}
              <span className="literal">/check-up</span> with Claude any time.
            </p>
          </Card>
        </Section>
      )}

      <Section
        title="Proposals"
        sub="What the check-up recommends for the week. Accept what you agree with and it joins your to-dos on the Overview; dismiss the rest."
      >
        <TodoList items={proposed} empty="Nothing waiting for a decision." />
      </Section>

      <Section title="In the review" sub="What the Sunday session with Claude goes through.">
        <ul className="list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-graphite">
          <li>
            The weekly test review, with the live numbers per arm, on the{" "}
            <Link href="/admin?tab=marketing" className="text-teal hover:text-teal-hover">
              Marketing tab
            </Link>
            .
          </li>
          <li>
            Whether each goal was hit, and next week&apos;s goals, which then show on the{" "}
            <Link href="/admin?tab=today" className="text-teal hover:text-teal-hover">
              Overview
            </Link>
            .
          </li>
          <li>The proposals above: which ones to act on this week.</li>
        </ul>
      </Section>

      {earlier.length + earlierReviews.length > 0 ? (
        <Section title="Earlier weeks">
          <div className="space-y-3">
            {[...earlierReviews, ...earlier]
              .sort((a, b) => b.key.slice(-10).localeCompare(a.key.slice(-10)))
              .map((note) => (
              <details key={note.key} className="card group p-5">
                <summary className="cursor-pointer list-none text-[0.9375rem] font-semibold text-ink">
                  {note.title}
                  <span className="ml-2 text-[0.8125rem] font-normal text-stone group-open:hidden">
                    Show
                  </span>
                </summary>
                <div className="mt-4">
                  <MarkdownLite source={note.body} />
                </div>
              </details>
              ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
