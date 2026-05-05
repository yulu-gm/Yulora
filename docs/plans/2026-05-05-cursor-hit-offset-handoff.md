# Cursor Hit Offset Handoff

Task: New bug proposal - cursor hit offset

What changed:
- Added a real Electron cursor hit geometry probe that clicks the center of visible text after transformed Markdown blocks and checks the resulting CodeMirror `posAtCoords` line.
- Reproduced the bug before the fix: text after an inactive thematic break and after a table widget mapped to lower source lines.
- Moved vertical spacing that affects editor hit-testing from external margins into measured padding / widget boxes.
- Added CSS contract coverage so CodeMirror-managed block spacing stays inside measured boxes.
- Documented the new regression scenario and decision.

Landing files:
- `src/renderer/styles/markdown-render.css`
- `src/renderer/cursor-hit-geometry-probe.ts`
- `src/renderer/cursor-hit-geometry-probe.html`
- `scripts/probe-cursor-hit-geometry.mjs`
- `scripts/electron-cursor-hit-geometry-main.cjs`
- `src/renderer/editor-source-layout.test.ts`
- `src/renderer/app.autosave.test.ts`
- `package.json`
- `docs/test-cases.md`
- `docs/decision-log.md`

Focused verification already run:
- `npm.cmd run test:cursor-hit-geometry`
- `npm.cmd run test:list-geometry`
- `npm.cmd run test -- src/renderer/editor-source-layout.test.ts src/renderer/code-editor.test.ts packages/editor-core/src/decorations/block-decorations.test.ts`
- `npm.cmd run test -- src/renderer/app.autosave.test.ts`

Recommended final verification:
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`
- `git diff --check`

Manual acceptance draft:
1. Open a document containing a blockquote, fenced code block, `+++` or `---` separator, table, and ordinary paragraphs below them.
2. Move the caret to the last paragraph so preceding blocks are inactive/rendered.
3. Click the visible center of the paragraph immediately below a separator.
4. Click the visible center of the paragraph immediately below a table.
5. Confirm the caret lands on the clicked line without needing to click above the text.

Known risks / not done:
- The probe covers transformed text blocks, thematic breaks, and table widgets; it does not yet cover image previews with large loaded media.
- Existing unrelated dirty files and prior untracked plan/tmp artifacts were left untouched.
