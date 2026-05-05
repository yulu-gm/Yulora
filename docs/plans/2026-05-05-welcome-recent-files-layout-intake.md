# Welcome recent files layout intake

Task: welcome-recent-files-layout
Goal: Remove the empty workspace headline and keep Recent files usable when the window height is limited.
In scope:
- Remove the `Your writing space is ready.` heading from the empty workspace.
- Make the Recent files list scroll internally when it grows taller than its available welcome area.
- Cover the behavior with focused renderer/CSS regression tests.
Out of scope:
- Recent files persistence, ordering, clearing, or settings behavior.
- Broader shell, rail, editor, or theme redesign.
Landing area:
- `src/renderer/editor/WorkspaceShell.tsx`
- `src/renderer/styles/app-ui.css`
- `src/renderer/editor/WorkspaceShell.test.tsx`
- `src/renderer/app.autosave.test.ts`
Acceptance:
- Empty workspace no longer renders the removed headline copy.
- Recent files keeps name/path rows visible and scrolls inside its own list area when entries overflow.
- Existing open and clear actions still delegate through the current renderer callbacks.
Verification:
- `npm run test -- src/renderer/editor/WorkspaceShell.test.tsx src/renderer/app.autosave.test.ts`
- `npm run typecheck`
- `npm run lint`
Risks:
- Low. This is renderer layout only and does not touch Markdown round-trip, save, IPC, or editor state.
Doc updates:
- Add execution handoff and update Recent files manual test expectation.
Next skill: `$fishmark-task-execution`
