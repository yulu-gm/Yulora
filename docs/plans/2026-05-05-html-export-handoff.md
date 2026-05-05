# HTML Export Handoff

Date: 2026-05-05
Task: html-export

## What changed

- Added an `Export HTML...` file menu command.
- Added a shared/main/preload IPC contract for exporting HTML.
- Added renderer-side standalone HTML generation from the active Markdown document.
- The exported file inlines the currently readable FishMark CSS/theme state and renders Markdown with FishMark reading-mode classes such as headings, paragraphs, lists, blockquotes, code fences, tables, images, and inline marks.
- The exported root/body now explicitly restore browser viewport scrolling, so application shell CSS does not suppress the standalone page scrollbar.
- The export path is independent from Markdown save, so exporting does not change the document save target or clear dirty state.

## Landing files

- `src/shared/export-html-file.ts`
- `src/main/export-html-file.ts`
- `src/renderer/export-html.ts`
- `src/shared/menu-command.ts`
- `src/main/application-menu.ts`
- `src/main/main.ts`
- `src/preload/preload.ts`
- `src/shared/product-bridge.ts`
- `src/renderer/editor/useEditorApplicationController.ts`
- `src/renderer/editor/App.tsx`
- Related tests in `src/main`, `src/preload`, and `src/renderer`.
- `package.json` dev wait-on list now includes the new shared export contract output.

## Verification run

- `npm.cmd run test -- src/main/package-scripts.test.ts src/main/application-menu.test.ts src/main/export-html-file.test.ts src/renderer/export-html.test.ts src/preload/preload.test.ts src/preload/preload.contract.test.ts src/renderer/editor/useEditorApplicationController.test.tsx`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run test:list-geometry`
- `git diff --check`
- Follow-up scrollbar probe against `tmp/fishmark-export-test.html`: document overflow was enabled and `window.scrollY` reached `240`.

## Manual comparison artifacts

- FishMark export: `tmp/fishmark-export-test.html`
- Comparison JSON: `tmp/export-compare-output/compare-result.json`
- FishMark export screenshot: `tmp/export-compare-output/fishmark-1280x900.png`
- Typora screenshot: `tmp/export-compare-output/typora-1280x900.png`

## Comparison notes

- Exported FishMark HTML now closely follows the current FishMark editor reading layout. In the 1280x900 probe, FishMark export scroll height is `9680`, close to the earlier live FishMark probe at `9551`.
- FishMark export still intentionally reflects FishMark, not Typora. Typora's export is `7224` high for the same file because it uses a narrower 800px content column, Open Sans/Clear Sans typography, smaller body line height, and different block spacing.
- Remaining Typora differences also come from Markdown feature coverage: Typora renders footnotes, emoji shortcodes, reference/image handling, and more code fence variants that FishMark currently keeps closer to Markdown source.

## Known risks

- The exported HTML is a static renderer that mirrors FishMark's current reading classes; it is not a serialized CodeMirror DOM snapshot. Future reading decorations should update `src/renderer/export-html.ts` with matching tests.
- Syntax highlighting inside code fences is not fully tokenized in the static export yet.
- Local images are emitted using their Markdown/HTML source URL; embedding image bytes is out of scope for this slice.

## Backlog/progress sync

- This was a new ad-hoc feature request, not an existing numbered backlog task. No MVP backlog checkbox was changed.
