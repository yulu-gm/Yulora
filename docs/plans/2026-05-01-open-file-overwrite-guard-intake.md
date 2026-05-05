# open-file-overwrite-guard intake

Task: open-file-overwrite-guard

Goal: Fix the high-severity data-loss bug where opening or switching to a new Markdown file can inherit the previously active editor content and later autosave it to the new file path.

In scope:
- Trace the workspace open / tab switch / save / autosave data flow.
- Add a regression test for stale save or autosave completion after the active tab changes.
- Guard renderer workspace refresh and save finalization so stale editor content cannot be flushed into a different active tab.

Out of scope:
- Recent files, crash recovery, or broad workspace session restore.
- Reworking the CodeMirror editor model or introducing a second editor instance.
- Changing existing line-ending normalization work already present in the worktree.

Landing area:
- `src/renderer/editor/useWorkspaceController.ts`
- `src/renderer/editor/useSaveController.ts`
- `src/renderer/editor/useEditorApplicationController.test.tsx`
- Possible focused updates in `docs/test-report.md` and `reports/task-summaries/`

Acceptance:
- Opening or switching to another tab while a prior save/autosave is in flight must not update the new active tab draft with stale content from the previous tab.
- Save/autosave success for a tab may refresh workspace metadata, but draft preservation must only use editor content when it still belongs to that same tab.
- Existing tabId-based save, autosave, open, and switch tests remain green.

Verification:
- `npm.cmd run test -- src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/app.autosave.test.ts src/main/workspace-service.test.ts`
- If focused tests pass, run at least `npm.cmd run typecheck` because this touches shared controller signatures.

Risks:
- High: autosave safety and file persistence.
- Medium: tab switching and active editor load revision.
- Low: UI layout.

Doc updates:
- Add fresh verification evidence to `docs/test-report.md`.
- Add a concise task summary under `reports/task-summaries/`.

Next skill: $fishmark-task-execution
