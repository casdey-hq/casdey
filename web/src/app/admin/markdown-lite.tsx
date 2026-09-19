import type { ReactNode } from "react";

/**
 * Renders the small slice of Markdown casdey HQ notes are written in: ## and
 * ### headings, - and 1. lists, paragraphs, **bold** and *italic*. Anything
 * else shows as the text it is.
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

    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
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
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();

  return <div className="space-y-3">{blocks}</div>;
}
