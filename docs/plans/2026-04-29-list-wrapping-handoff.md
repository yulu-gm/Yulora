# 2026-04-29 List Wrapping Handoff

## Changed

- Added hanging-indent layout variables for inactive Markdown list rows.
- Added active list row classes so the currently edited list item uses the same wrapping geometry while keeping source markers visible.
- Added per-row source prefix offsets for active rows and hidden inactive source-prefix marks so nested source text like `  - ` no longer pushes inactive content out of alignment.
- Added continuation line classes so hard-wrapped list item content inherits the owning item's depth and content offset.
- Treated a document-final single `-` after a paragraph as a provisional empty list item instead of a Setext heading underline, so starting a new list does not restyle the previous line.
- Added forced visual wrapping for long continuous list text with `overflow-wrap: anywhere`.
- Added `word-break: break-all` because Chromium otherwise prefers the break opportunity after the Markdown marker space and leaves the marker on a line by itself.
- Raised list wrapping selectors to `.cm-line.cm-...` specificity so CodeMirror's injected `.cm-lineWrapping .cm-line` rule cannot override the hanging indent.
- Preserved nested list indentation by separating depth offset from content offset.
- Added renderer CSS and editor decoration tests for list hanging indentation, active rows, nested rows, hidden inactive prefixes, and continuation rows.

## Files

- `src/renderer/styles/markdown-render.css`
- `src/renderer/app.autosave.test.ts`
- `src/renderer/code-editor.test.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/parse-block-map.test.ts`
- `docs/plans/2026-04-29-list-wrapping-intake.md`
- `docs/plans/2026-04-29-list-wrapping-handoff.md`

## Recommended Verification

- `npm run test -- src/renderer/app.autosave.test.ts -t "renders markdown lists and quotes"`
- `npm run test -- src/renderer/code-editor.test.ts -t "applies active list line classes"`
- `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts -t "trailing single dash"`
- `npm run test -- src/renderer/code-editor.test.ts`
- `npm run test -- src/renderer/app.autosave.test.ts`
- `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Manual Check

Create an unordered list item, an ordered list item, a task list item, and a nested child list item with a long continuous string. Confirm both focused and unfocused list rows wrap without a blank visual gap, and every wrapped line starts under that item's first content character. Also add a hard continuation line inside a child item and confirm it keeps the child indentation. Finally, type a normal paragraph followed by a single trailing `-` and confirm the paragraph line does not move or become a heading.

## Visual Verification

- Rendered a minimal local HTML fixture that loads `editor-source.css`, `markdown-render.css`, and a later `.cm-lineWrapping .cm-line` rule to simulate CodeMirror injection. Before the final fix, the marker stayed on its own visual row; after the final fix, the marker and long content shared the first row and wrapped under the content start.
- Launched `./tools/dev-app.sh`, created a new untitled document, and entered long parent and child unordered list items in the Electron window. The parent marker stayed on the same row as the long content, and continuation rows aligned under the first content character.
- After the nested-list follow-up, added a direct editor decoration regression for child list source prefix offsets, hidden inactive source prefixes, and child continuation rows.
- After the trailing-dash follow-up, added parser and editor regressions proving `paragraph\n-` at document end leaves the paragraph as a paragraph and applies active list styling only to the dash line.

## Risk

The change keeps active list source text visible, but hides inactive list source prefixes from text flow and positions inactive markers independently. Active rows still use line-level layout classes and inline CSS variables so soft wrapping remains stable while the raw Markdown prefix is visible.
