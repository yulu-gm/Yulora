Task: Editor scrollbar mode guard

Status: implementation complete, ready for acceptance

Changed:
- Added an editor scrollbar hit-test guard in `src/renderer/editor/App.tsx`.
- The app-workspace capture path now treats CodeMirror scrollbar mousedown as editor scroll interaction instead of blank-area mode exit.
- The editor-container capture path also lets scrollbar mousedown pass through without calling `enterReadingMode()`.
- Expanded the renderer test CodeMirror mock to expose `.cm-scroller` geometry and scrollbar metrics.
- Added a focused regression test for dragging the editor scrollbar while already in editing mode.

Landing files:
- `src/renderer/editor/App.tsx`
- `src/renderer/app.autosave.test.ts`
- `docs/plans/2026-05-05-editor-scrollbar-mode-guard-intake.md`
- `docs/plans/2026-05-05-editor-scrollbar-mode-guard-handoff.md`

Verification:
- Red check: `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "keeps editing mode when the user drags the editor scrollbar"` failed before the production fix with `expected 'reading' to be 'editing'`.
- Focused green: `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "keeps editing mode when the user drags the editor scrollbar"` passed.
- Related renderer suite: `npm.cmd run test -- src/renderer/app.autosave.test.ts` passed, 151 tests.
- Typecheck: `npm.cmd run typecheck` passed.
- Lint: `npm.cmd run lint` passed with the existing Fast Refresh warning in `src/renderer/editor/App.tsx`.
- Build: `npm.cmd run build` passed with the existing Vite chunk-size warning.
- Full tests: `npm.cmd run test` passed, 94 files / 947 tests.

Manual acceptance draft:
1. Open an existing Markdown document so FishMark starts in reading mode.
2. Click into the document body and confirm it enters editing mode.
3. Drag the vertical editor scrollbar and confirm the page scrolls while the shell remains in editing mode.
4. Click a true blank area outside the editor content and confirm it still exits to reading mode.
5. Press `Esc` from editing mode and confirm it still exits to reading mode.

Known notes:
- Existing unrelated worktree changes were left untouched.
- This does not change CodeMirror scroll styling or autosave behavior.
