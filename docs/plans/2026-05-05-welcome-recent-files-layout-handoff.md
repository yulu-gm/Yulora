# Welcome recent files layout handoff

Task: welcome-recent-files-layout

## What changed

- Removed the empty workspace headline `Your writing space is ready.` from the welcome screen.
- Kept the remaining welcome copy and shortcut hint.
- Added an internal scroll constraint to `.recent-file-list` so Recent files can scroll within its own area when the window is short or the list is long.
- Updated focused renderer/CSS tests and the Recent files manual test expectation.

## Landing files

- `src/renderer/editor/WorkspaceShell.tsx`
- `src/renderer/styles/app-ui.css`
- `src/renderer/editor/WorkspaceShell.test.tsx`
- `src/renderer/app.autosave.test.ts`
- `docs/test-cases.md`

## Development verification

- `npm.cmd run test -- src/renderer/editor/WorkspaceShell.test.tsx src/renderer/app.autosave.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

`lint` exits successfully with the existing `react-refresh/only-export-components` warning in `src/renderer/editor/App.tsx`.

## Manual acceptance draft

1. Start FishMark with enough recent files to exceed the visible welcome area.
2. Confirm the welcome screen no longer shows `Your writing space is ready.`
3. Shrink the window height and confirm the Recent files list scrolls inside its own list area.
4. Click a recent file and confirm it still opens in the current workspace.
5. Clear a recent file and confirm the clear action still works.

## Known risks / not done

- No persistence or ordering behavior changed.
- No broad responsive redesign was attempted beyond the requested welcome screen adjustment.
