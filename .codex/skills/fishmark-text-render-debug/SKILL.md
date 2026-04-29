---
name: fishmark-text-render-debug
description: Use when debugging FishMark Markdown or CodeMirror text rendering, wrapping, indentation, alignment, theme CSS, decoration classes, or screenshot-only style regressions where Codex must prove the rendered result is visually correct.
---

# FishMark Text Render Debug

Use this skill for text rendering bugs in FishMark: Markdown list wrapping, child indentation, inline marker hiding, headings, blockquotes, code wrapping, theme CSS, or CodeMirror decoration layout.

The goal is not just to make tests pass. The goal is to prove the rendered pixels match the expected text geometry.

## Canonical Style Contract

Before judging Markdown text spacing, read `docs/standards/markdown-text-rendering-standard.json`.

That JSON is the source of truth for:

- line-height and letter-spacing constraints,
- list depth increments,
- marker-to-text gap,
- paragraph and block spacing,
- wrapping geometry,
- theme compliance rules.

If a screenshot looks acceptable but violates that JSON, the rendering is not acceptable. If the JSON and CSS disagree, fix the implementation or explicitly update the JSON as part of the same reviewed change.

## Required Workflow

1. Reproduce from the user's exact Markdown.
   - Preserve spaces, blank lines, cursor location, active/inactive state, theme, and viewport width.
   - If the user points at a `/tmp/*.html` file, treat it as possibly stale. Regenerate it from current repo files before trusting it.

2. Diagnose the layer that owns the bug.
   - Parser: block boundaries or Markdown ambiguity changed a line's block type.
   - Decoration: CodeMirror line classes, mark ranges, inline widgets, or active-line handling are wrong.
   - CSS: wrapping, `padding-left`, `text-indent`, `white-space`, `overflow-wrap`, marker positioning, or theme variables are wrong.
   - Runtime: CodeMirror injected rules, theme package order, Electron font metrics, or viewport width differ from the fixture.

3. Add structure tests first.
   - Parser tests for block shape when Markdown ambiguity is involved.
   - Decoration tests for line classes, mark ranges, active/inactive state, and CSS variables.
   - CSS contract tests for selectors and critical declarations.

4. Observe current-code rendering.
   - Do not reuse old `/tmp` fixtures or old screenshots.
   - Generate a fresh minimal fixture from the current repo CSS when useful, or use the real Electron app.
   - Include active and inactive rows, parent and child list rows, long continuous text, hard continuation lines, task/ordered variants when relevant, and the narrow viewport that triggered the issue.

5. Measure geometry, not just appearance.
   - Use browser DOM ranges when possible: `Range.getClientRects()` on the visible content text.
   - Compare the first content rect's `left` with each wrapped-line rect's `left`.
   - Treat differences above 1-2 px as a failure unless there is a clear font/rendering reason.
   - For list bugs, measure each nesting level separately.

6. Confirm in real Electron.
   - Start or reuse `./tools/dev-app.sh` only if it reflects current code.
   - Create a temporary untitled document rather than changing user files.
   - Use screenshots and, when available, accessibility text to confirm the actual app matches the fixture.
   - Do not close an unsaved document if it would trigger a confirmation unless the user asks.

7. Run quality gates.
   - Run focused tests first, then the relevant full test set.
   - For FishMark text rendering fixes, normally run:
     - `npm run test -- src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts packages/editor-core/src/decorations/block-decorations.test.ts packages/markdown-engine/src/parse-block-map.test.ts`
     - `npm run typecheck`
     - `npm run lint`
     - `npm run build`
     - `git diff --check`

## Red Flags

- A screenshot looks fixed but comes from an old `/tmp` fixture.
- Active editor rows still differ from inactive rendered rows.
- The user's cursor position changes the block type or style of the previous line.
- Child list soft wraps align with the parent list, not with the child content start.
- CSS fixes rely only on `text-indent` while raw Markdown prefixes remain in the text flow.
- A visual test lacks a pixel or DOM-coordinate assertion for the actual alignment being claimed.

## Reporting

In the final answer, state:

- the exact root cause layer or layers,
- what was measured or observed visually,
- which real app or fixture was used,
- which commands passed,
- any remaining existing warnings that are unrelated.
