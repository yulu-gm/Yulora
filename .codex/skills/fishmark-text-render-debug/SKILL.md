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
   - Structure tests are necessary but not sufficient: jsdom can prove classes/styles exist, but it cannot prove browser text layout, wrapping, marker columns, or baselines are correct.

4. Observe current-code rendering.
   - Do not reuse old `/tmp` fixtures or old screenshots.
   - Generate a fresh minimal fixture from the current repo CSS when useful, or use the real Electron app.
   - Include active and inactive rows, parent and child list rows, long continuous text, hard continuation lines, task/ordered variants when relevant, and the narrow viewport that triggered the issue.
   - For screenshot-reported regressions, create a repeatable browser/Electron geometry probe before fixing whenever the failure could involve real font metrics, inline flow, marker positioning, wrapping, or vertical alignment.

5. Measure geometry, not just appearance.
   - Use browser DOM ranges when possible: `Range.getClientRects()` on the visible content text.
   - Compare the first content rect's `left` with each wrapped-line rect's `left`.
   - Treat differences above 1-2 px as a failure unless there is a clear font/rendering reason.
   - For list bugs, measure each nesting level separately.
   - For active/inactive transition bugs, measure the same Markdown row in both states and compare numeric deltas, not screenshots alone.
   - For list bugs, measure both content and marker geometry:
     - content rect `left` and `top`,
     - marker glyph or marker-box rect `left`, `right`, and `top`,
     - line rect `top` and `height`,
     - marker-to-content vertical alignment or baseline proxy.
   - If a list marker can be ordered, unordered, task, alphabetic, or custom text, do not rely on marker character width. The marker must occupy a stable marker column, and the content must occupy a stable content column.
   - A useful failure report includes exact deltas, for example `contentTop +9.4375px` or `markerRight -25.234375px`, so the owner layer can be identified.

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
- A jsdom test passes but no browser/Electron probe has measured the real glyph rectangles.
- Content alignment is measured without marker alignment; list markers can still shift, wrap, or sit on a different baseline.
- A fix assumes marker text width from characters, `ch`, or source prefix length instead of using a stable marker column.

## Probe Pattern

When real layout is suspect, add a temporary or committed geometry probe that:

- loads current repo CSS and the same CodeMirror/editor code path as the app,
- renders the minimal Markdown fixture in a real browser engine, preferably Electron/Chromium,
- measures inactive state, then moves the selection to the target row and measures active state,
- returns JSON containing active/inactive rects and deltas,
- exits non-zero when deltas exceed the contract.

For list active/inactive bugs, the probe should fail if any of these move beyond tolerance:

- content `left` or `top`,
- marker `left`, `right`, or `top`,
- line `top` or `height`,
- marker/content vertical alignment.

Use the probe result to decide the owner layer. Example: content `left = 0` but content `top = +9px` and marker `right = -25px` means the issue is marker/text inline flow or marker column ownership, not indentation depth math.

## Reporting

In the final answer, state:

- the exact root cause layer or layers,
- what was measured or observed visually,
- which real app or fixture was used,
- which commands passed,
- any remaining existing warnings that are unrelated.
