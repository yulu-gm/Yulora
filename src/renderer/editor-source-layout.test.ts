import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function getCssRule(stylesheet: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  return match?.[1] ?? "";
}

describe("editor source layout stylesheet", () => {
  it("pins the CodeMirror content area to the top even when the document is empty", async () => {
    const stylesheet = await readFile(resolve(process.cwd(), "src/renderer/styles/editor-source.css"), "utf8");
    const scrollerRule = getCssRule(stylesheet, ".document-editor .cm-scroller");
    const contentRule = getCssRule(stylesheet, ".document-editor .cm-content");

    expect(scrollerRule).toContain("align-items: flex-start !important;");
    expect(contentRule).toContain("min-height: 100%;");
  });
});
