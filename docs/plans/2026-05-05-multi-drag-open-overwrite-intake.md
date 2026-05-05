# Multi-file Drag Open Overwrite Bug Intake

Task: TASK-043 follow-up bugfix

Goal: Fix the data-loss class bug where dragging multiple selected Markdown files into FishMark can cause some opened documents to be overwritten with another document's content.

In scope:
- Trace the multi-file drag-open flow across renderer, preload, and main workspace handling.
- Ensure each dragged file opens into a distinct tab with the correct path and content.
- Ensure editor draft synchronization, autosave, and save operations remain scoped to the intended `tabId`.
- Add a regression test that fails before the fix.

Out of scope:
- Recent files UI.
- Image drag/drop import.
- Workspace session restore.
- Replacing the existing Electron / React / CodeMirror workspace architecture.

Landing area:
- `src/main/` workspace and open-file handling.
- `src/shared/` workspace contracts if needed.
- `src/renderer/` drag/drop and workspace controller flow if needed.
- Relevant unit or renderer tests.

Acceptance:
- Dragging multiple Markdown files into an existing window creates separate tabs.
- Each opened tab keeps its own file path and original file content.
- Switching between opened tabs does not copy one document's draft into another tab.
- Saving one dragged-in tab cannot overwrite a different dragged-in file.

Verification:
- `npm run test -- <focused test files>`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Risks:
- Autosave safety.
- Markdown round-trip.
- Cross-window workspace snapshot consistency.
- Data loss if active editor draft is flushed to the wrong `tabId`.

Doc updates:
- Add execution handoff under `docs/plans/`.
- Update `docs/test-cases.md` only if the manual regression steps need to be made more explicit.
- Update `docs/test-report.md` and task summary during acceptance, not execution.

Next skill: $fishmark-task-execution
