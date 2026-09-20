import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownLite } from "./markdown-lite";

const html = (source: string) => renderToStaticMarkup(<MarkdownLite source={source} />);

describe("MarkdownLite", () => {
  /**
   * The bug this file exists for (2026-09-20): notes are written in a file and
   * hard wrapped like any other Markdown, and every line after the first of a
   * bullet used to end the list and become its own stray paragraph, so a
   * correctly written check-up rendered as shrapnel on /admin.
   */
  it("keeps a wrapped bullet as one item", () => {
    const out = html("- **T2 keeps running.** No winner called,\n  week 1 of 4.\n- Second item.");
    expect(out).toContain("<li><strong class=\"font-semibold text-ink\">T2 keeps running.</strong> No winner called, week 1 of 4.</li>");
    expect(out.match(/<ul/g)).toHaveLength(1);
    expect(out.match(/<li>/g)).toHaveLength(2);
    expect(out).not.toContain("<p");
  });

  it("continues a wrapped numbered item too", () => {
    const out = html("1. First,\n   wrapped.\n2. Second.");
    expect(out.match(/<li>/g)).toHaveLength(2);
    expect(out).toContain("First, wrapped.");
  });

  it("renders a table with a header row", () => {
    const out = html("| Arm | Engaged |\n| --- | --- |\n| A | 0 |\n| V | **2** |");
    expect(out).toContain("<th");
    expect(out.match(/<tr/g)).toHaveLength(3);
    expect(out).toContain("<strong class=\"font-semibold text-ink\">2</strong>");
    expect(out).not.toContain("---");
  });

  it("renders a table with no separator row as all body", () => {
    const out = html("| a | b |\n| c | d |");
    expect(out).not.toContain("<th");
    expect(out.match(/<tr/g)).toHaveLength(2);
  });

  it("renders a > line as a callout, not a paragraph of text", () => {
    const out = html("> The 02:00 check-up could not see this.");
    expect(out).toContain("border-l-2");
    expect(out).not.toContain("&gt;");
  });

  it("still handles headings, bold and italic", () => {
    const out = html("## What we decided\n\nPlain **bold** and *italic*.");
    expect(out).toContain("<h3");
    expect(out).toContain("<strong");
    expect(out).toContain("<em");
  });

  it("treats a table interrupted by a blank line as two tables", () => {
    const out = html("| a |\n\n| b |");
    expect(out.match(/<table/g)).toHaveLength(2);
  });
});
