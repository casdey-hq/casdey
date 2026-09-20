import type { ReactNode } from "react";

/**
 * Renders the small slice of Markdown casdey HQ notes are written in: ## and
 * ### headings, - and 1. lists, tables, > callouts, paragraphs, **bold** and
 * *italic*. Anything else shows as the text it is.
 *
 * Wrapped lines work (2026-09-20). A note is written in a file and hard
 * wrapped like any other Markdown, and until this was fixed every line after
 * the first of a bullet ended the list and became its own stray paragraph, so
 * a correctly written note rendered as shrapnel. A non-blank line under an
 * open list item now continues it, which is what Markdown calls lazy
 * continuation.
 *
 * Built as React elements, never as HTML, so a note can hold any characters
 * without them being read as markup. A dependency would render more, but the
 * notes are written by Davide and Claude in this subset and nowhere else.
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const token = match[0];
    parts.push(
      token.startsWith("**") ? (
        <strong key={`${keyPrefix}-${index}`} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      ) : (
        <em key={`${keyPrefix}-${index}`}>{token.slice(1, -1)}</em>
      ),
    );
    last = at + token.length;
    index += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownLite({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-[0.9375rem] leading-relaxed text-graphite">
        {inline(text, `p-${blocks.length}`)}
      </p>,
    );
    paragraph = [];
  };
  const table: string[] = [];
  const flushTable = () => {
    if (table.length === 0) return;
    const cells = (row: string) =>
      row.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
    // A separator row (|---|---|) is optional: with one, row 1 is the header.
    const header = table.length > 1 && /^[\s|:-]+$/.test(table[1]) ? cells(table[0]) : null;
    const body = table.slice(header ? 2 : 0).map(cells);
    const key = `t-${blocks.length}`;
    blocks.push(
      <div key={key} className="overflow-x-auto">
        <table className="w-full text-left text-[0.9375rem] leading-relaxed text-graphite">
          {header ? (
            <thead>
              <tr className="border-b border-ash">
                {header.map((cell, i) => (
                  <th key={i} className="py-1.5 pr-4 font-semibold text-ink">
                    {inline(cell, `${key}-h-${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="border-b border-ash/60 last:border-0">
                {row.map((cell, c) => (
                  <td key={c} className="py-1.5 pr-4 align-top">
                    {inline(cell, `${key}-${r}-${c}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    table.length = 0;
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    const key = `l-${blocks.length}`;
    blocks.push(
      <Tag
        key={key}
        className={`${list.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5 text-[0.9375rem] leading-relaxed text-graphite`}
      >
        {list.items.map((item, i) => (
          <li key={i}>{inline(item, `${key}-${i}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);

    const quote = /^>\s?(.*)$/.exec(line);
    const isTableRow = /^\s*\|.*\|\s*$/.test(line);

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushTable();
    } else if (isTableRow) {
      flushParagraph();
      flushList();
      table.push(line.trim());
    } else if (quote) {
      flushParagraph();
      flushList();
      flushTable();
      blocks.push(
        <p
          key={`q-${blocks.length}`}
          className="border-l-2 border-teal pl-3 text-[0.9375rem] leading-relaxed text-graphite"
        >
          {inline(quote[1], `q-${blocks.length}`)}
        </p>,
      );
    } else if (heading) {
      flushParagraph();
      flushList();
      flushTable();
      blocks.push(
        heading[1].length === 2 ? (
          <h3 key={`h-${blocks.length}`} className="display pt-2 text-[1.0625rem] text-ink">
            {inline(heading[2], `h-${blocks.length}`)}
          </h3>
        ) : (
          <h4 key={`h-${blocks.length}`} className="pt-1 text-[0.9375rem] font-semibold text-ink">
            {inline(heading[2], `h-${blocks.length}`)}
          </h4>
        ),
      );
    } else if (bullet || numbered) {
      flushParagraph();
      flushTable();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (list) {
      // Lazy continuation: a wrapped line belongs to the item above it.
      list.items[list.items.length - 1] += ` ${line.trim()}`;
    } else {
      flushTable();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  flushTable();

  return <div className="space-y-3">{blocks}</div>;
}
