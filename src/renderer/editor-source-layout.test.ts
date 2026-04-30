import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function getCssRule(stylesheet: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  return match?.[1] ?? "";
}

const forbiddenListGeometryVariables = [
  "--fishmark-list-marker-size",
  "--fishmark-list-marker-text-gap",
  "--fishmark-list-unordered-marker-left",
  "--fishmark-list-ordered-marker-width",
  "--fishmark-list-unordered-content-offset",
  "--fishmark-list-ordered-content-offset",
  "--fishmark-list-task-marker-left",
  "--fishmark-list-task-content-offset",
  "--fishmark-list-nested-indent",
  "--fishmark-task-size"
];

async function getThemeMarkdownStylePaths(): Promise<string[]> {
  const projectRoot = process.cwd();
  const fixtureThemeRoot = resolve(projectRoot, "fixtures/themes");
  const fixtureThemeEntries = await readdir(fixtureThemeRoot, { withFileTypes: true });

  return [
    resolve(projectRoot, "src/renderer/theme-packages/default/styles/markdown.css"),
    ...fixtureThemeEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(fixtureThemeRoot, entry.name, "styles/markdown.css"))
  ].sort();
}

function toProjectRelativePath(path: string): string {
  return path.replace(`${process.cwd()}\\`, "").replaceAll("\\", "/");
}

describe("editor source layout stylesheet", () => {
  it("pins the CodeMirror content area to the top even when the document is empty", async () => {
    const stylesheet = await readFile(resolve(process.cwd(), "src/renderer/styles/editor-source.css"), "utf8");
    const scrollerRule = getCssRule(stylesheet, ".document-editor .cm-scroller");
    const contentRule = getCssRule(stylesheet, ".document-editor .cm-content");

    expect(scrollerRule).toContain("align-items: flex-start !important;");
    expect(contentRule).toContain("min-height: 100%;");
  });

  it("keeps active list content anchored to the inactive content start", async () => {
    const stylesheet = await readFile(resolve(process.cwd(), "src/renderer/styles/markdown-render.css"), "utf8");
    const activeListRule = getCssRule(stylesheet, ".document-editor .cm-line.cm-active-list");
    const activeContinuationRule = getCssRule(
      stylesheet,
      ".document-editor .cm-line.cm-active-list-continuation"
    );

    expect(activeListRule).toContain(
      "padding-left: calc(var(--fishmark-list-depth-offset) + var(--fishmark-list-content-offset));"
    );
    expect(activeListRule).toContain("text-indent: calc(-1 * var(--fishmark-list-source-prefix-offset));");
    expect(activeContinuationRule).toContain(
      "padding-left: calc(var(--fishmark-list-depth-offset) + var(--fishmark-list-content-offset));"
    );
    expect(activeContinuationRule).toContain("text-indent: calc(-1 * var(--fishmark-list-source-prefix-offset));");

    const depthStepEm = 1.4;
    const unorderedContentOffsetEm = 1.16;
    const sourcePrefixOffsetsEm = [1, 2, 3];

    for (const depth of [0, 1, 2]) {
      const sourcePrefixOffset = sourcePrefixOffsetsEm[depth] ?? 0;
      const inactiveContentStart = depth * depthStepEm + unorderedContentOffsetEm;
      const activeTextStart = inactiveContentStart - sourcePrefixOffset;
      const activeContentStart = activeTextStart + sourcePrefixOffset;

      expect(activeContentStart).toBeCloseTo(inactiveContentStart);
    }
  });

  it("keeps theme markdown styles out of app-owned list geometry", async () => {
    const violations: string[] = [];

    for (const path of await getThemeMarkdownStylePaths()) {
      const stylesheet = await readFile(path, "utf8");

      for (const variableName of forbiddenListGeometryVariables) {
        if (stylesheet.includes(`${variableName}:`)) {
          violations.push(`${toProjectRelativePath(path)} -> ${variableName}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
