import { describe, expect, it, vi } from "vitest";

import { parseMarkdownDocument } from "@yulora/markdown-engine";

import { createMarkdownDocumentCache } from "./markdown-document-cache";
import { deriveInactiveBlockDecorationsState } from "./inactive-block-decorations";

describe("deriveInactiveBlockDecorationsState", () => {
  it("reuses the cached block map across selection-only updates", () => {
    const source = ["# Title", "", "Paragraph"].join("\n");
    const parseSpy = vi.fn(parseMarkdownDocument);
    const markdownDocumentCache = createMarkdownDocumentCache(parseSpy);

    const initialResult = deriveInactiveBlockDecorationsState({
      source,
      selection: { anchor: 0, head: 0 },
      hasEditorFocus: false,
      markdownDocumentCache
    });

    const nextResult = deriveInactiveBlockDecorationsState({
      source,
      selection: {
        anchor: source.indexOf("Paragraph"),
        head: source.indexOf("Paragraph")
      },
      hasEditorFocus: false,
      markdownDocumentCache
    });

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(initialResult.activeBlockState.activeBlock?.type).toBe("heading");
    expect(nextResult.activeBlockState.activeBlock?.type).toBe("paragraph");
    expect(nextResult.activeBlockState.blockMap).toBe(initialResult.activeBlockState.blockMap);
  });

  it("refreshes the decoration signature when only inline markers change", () => {
    const sourceWithStrong = "Paragraph with **bold**";
    const sourceWithEmphasis = "Paragraph with *bold*";
    const markdownDocumentCache = createMarkdownDocumentCache(parseMarkdownDocument);

    const strongResult = deriveInactiveBlockDecorationsState({
      source: sourceWithStrong,
      selection: { anchor: 0, head: 0 },
      hasEditorFocus: false,
      markdownDocumentCache
    });

    const emphasisResult = deriveInactiveBlockDecorationsState({
      source: sourceWithEmphasis,
      selection: { anchor: 0, head: 0 },
      hasEditorFocus: false,
      markdownDocumentCache
    });

    expect(strongResult.activeBlockState.activeBlock?.type).toBe("paragraph");
    expect(emphasisResult.activeBlockState.activeBlock?.type).toBe("paragraph");
    expect(strongResult.signature).not.toBe(emphasisResult.signature);
  });

  it("refreshes the decoration signature when only list item inline markers change", () => {
    const sourceWithStrong = "- **bold**";
    const sourceWithEmphasis = "- *bold*";
    const markdownDocumentCache = createMarkdownDocumentCache(parseMarkdownDocument);

    const strongResult = deriveInactiveBlockDecorationsState({
      source: sourceWithStrong,
      selection: { anchor: 0, head: 0 },
      hasEditorFocus: false,
      markdownDocumentCache
    });

    const emphasisResult = deriveInactiveBlockDecorationsState({
      source: sourceWithEmphasis,
      selection: { anchor: 0, head: 0 },
      hasEditorFocus: false,
      markdownDocumentCache
    });

    expect(strongResult.activeBlockState.activeBlock?.type).toBe("list");
    expect(emphasisResult.activeBlockState.activeBlock?.type).toBe("list");
    expect(strongResult.signature).not.toBe(emphasisResult.signature);
  });
});
