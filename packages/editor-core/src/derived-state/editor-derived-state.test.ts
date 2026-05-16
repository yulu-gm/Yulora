import { describe, expect, it, vi } from "vitest";

import { parseMarkdownDocument } from "@fishmark/markdown-engine";

import { createEditorDerivedState } from "./editor-derived-state";

describe("createEditorDerivedState", () => {
  it("builds one reusable derived state from a single Markdown document parse", () => {
    const source = [
      "# **Title**",
      "",
      "| name | qty |",
      "| --- | ---: |",
      "| pen | 2 |",
      "",
      "[hero]: hero.png"
    ].join("\n");
    const parseSpy = vi.fn(parseMarkdownDocument);
    const selectionOffset = source.indexOf("pen");

    const state = createEditorDerivedState({
      source,
      selection: {
        anchor: selectionOffset,
        head: selectionOffset
      },
      parseMarkdownDocument: parseSpy
    });

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(state.source).toBe(source);
    expect(state.markdownDocument).toBe(parseSpy.mock.results[0]?.value);
    expect(state.activeBlockState.blockMap).toBe(state.markdownDocument);
    expect(state.activeBlockState.activeBlock?.type).toBe("table");
    expect(state.tableCursor).toMatchObject({
      mode: "inside",
      row: 1,
      column: 0
    });
    expect(state.activeBlockState.tableCursor).toBe(state.tableCursor);
    expect(state.referenceDefinitions?.get("hero")?.href).toBe("hero.png");
    expect(state.outlineHeadings).toEqual([
      {
        id: "heading:0-11",
        depth: 1,
        label: "Title",
        startOffset: 0,
        startLine: 1
      }
    ]);
  });
});
