# FishMark HTML Export Intake

Task: new proposal, `html-export`

Goal: Add a native HTML export command for the active Markdown document. The exported file must preserve FishMark's current editor reading presentation by reusing the same Markdown rendering classes, theme variables, and CSS that the editor uses.

In scope:
- Add a File menu command for `Export HTML...`.
- Add preload/shared/main IPC for writing a generated HTML file through a save dialog.
- Generate a standalone HTML document in the renderer from the active Markdown content.
- Inline the active FishMark editor/Markdown CSS and root theme variables so the file can be opened outside FishMark.
- Add focused tests for HTML generation, bridge contracts, menu routing, and main-process file writing.
- Compare the exported FishMark HTML with the Typora-exported HTML using `tmp/test.md`.

Out of scope:
- Matching Typora's visual theme or changing FishMark's current editor reading style.
- Adding new Markdown dialect features such as footnotes, emoji replacement, typographer, or front matter hiding.
- Exporting PDF or image formats.
- Replacing the CodeMirror editing model or Markdown parser.

Landing area:
- `src/shared/export-html-file.ts`
- `src/main/export-html-file.ts`
- `src/shared/menu-command.ts`
- `src/main/application-menu.ts`
- `src/main/main.ts`
- `src/preload/preload.ts`
- `src/shared/product-bridge.ts`
- `src/renderer/export-html.ts`
- `src/renderer/editor/useEditorApplicationController.ts`
- related tests in `src/main`, `src/preload`, and `src/renderer`

Acceptance:
- The File menu exposes `Export HTML...`.
- Triggering the command with an active document opens an HTML save dialog.
- The saved HTML contains a standalone document shell, the active Markdown rendered with FishMark reading classes, and inlined current CSS/theme variables.
- Existing Markdown save/open behavior remains unchanged.
- Export failure or cancellation does not dirty or mutate the active Markdown document.
- A generated `tmp/test.md` export can be visually compared against the provided Typora HTML.

Verification:
- `npm.cmd run test -- src/renderer/export-html.test.ts src/main/export-html-file.test.ts src/main/application-menu.test.ts src/preload/preload.contract.test.ts src/preload/preload.test.ts src/renderer/editor/useEditorApplicationController.test.tsx`
- `npm.cmd run test:list-geometry`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`

Risks:
- Renderer/export parity: the export must reuse current CSS and class contracts rather than inventing a parallel style.
- Round-trip safety: exporting must not modify Markdown source or autosave state.
- Cross-platform save dialog defaults and file paths.
- Future custom themes may include CSS that is not readable through `document.styleSheets`; the export path needs a safe fallback.

Doc updates:
- Add execution handoff after implementation.
- Update test report or task summary only if final acceptance is run.

Next skill: `$fishmark-task-execution`
