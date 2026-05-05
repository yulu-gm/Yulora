# Multi-file Drag Open Overwrite Bug Handoff

Task: TASK-043 follow-up bugfix

What changed:
- Added a batch path-open command in the renderer workspace controller.
- Multi-file drag/drop now flushes the current active draft once before opening the dropped file list.
- Consecutive dropped files are opened by applying each workspace snapshot without re-flushing stale CodeMirror content into the newly opened tab.
- Added a regression test for the stale-editor-content race.
- Expanded the manual drag-open test case to cover simultaneous multi-file drops and per-tab save isolation.

Landing files:
- `src/renderer/editor/useWorkspaceController.ts`
- `src/renderer/editor/useWorkspaceController.test.tsx`
- `src/renderer/editor/useEditorApplicationController.ts`
- `src/renderer/editor/App.tsx`
- `src/renderer/editor/WorkspaceShell.test.tsx`
- `docs/test-cases.md`

Recommended verification:
- `npm.cmd run test -- src/renderer/editor/useWorkspaceController.test.tsx`
- `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "multiple files"`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run test` after the existing workspace-header test expectations are reconciled with the current shell-header removal.

Manual acceptance draft:
1. Open an existing Markdown document and edit it without saving.
2. Select at least two different Markdown files in the system file manager and drag them into FishMark.
3. Confirm the existing document remains dirty with its own content.
4. Confirm each dropped file appears as a separate tab with its own path and content.
5. Switch between the dropped tabs and save one of them.
6. Confirm only that tab's corresponding disk file changed.

Known risks or not-done:
- Full `npm.cmd run test` is currently blocked by existing `src/renderer/app.autosave.test.ts` expectations that still require the removed workspace header DOM/CSS.
- No main/preload IPC contract change was needed.
