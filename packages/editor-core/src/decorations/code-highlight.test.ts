import type { Decoration } from "@codemirror/view";
import type { Range } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { appendCodeHighlightRanges } from "./code-highlight";

function collectHighlightRanges(source: string, info: string): Range<Decoration>[] {
  const ranges: Range<Decoration>[] = [];

  appendCodeHighlightRanges(source, 0, source.length, info, ranges);

  return ranges;
}

describe("appendCodeHighlightRanges", () => {
  it("keeps common JavaScript fences highlighted synchronously", () => {
    const ranges = collectHighlightRanges("const answer = 42;", "js");

    expect(ranges.length).toBeGreaterThan(0);
  });

  it("leaves low-frequency language fences unhighlighted instead of eager-loading parsers", () => {
    const ranges = collectHighlightRanges("SELECT * FROM notes;", "sql");

    expect(ranges).toEqual([]);
  });
});
