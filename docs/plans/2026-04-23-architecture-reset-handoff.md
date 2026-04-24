# Architecture Reset Handoff

Date: 2026-04-24

Branch: `codex/architecture-reset`

Worktree: `/Users/chenglinwu/Documents/Yulora/.worktrees/codex-architecture-reset`

## Closed Findings

- Closed: workspace truth split. Writable tab content, dirty state, save state, close checks, reload and save refresh now flow through the main-owned workspace snapshot and renderer controllers.
- Closed: renderer shell orchestration. Save, workspace, external-conflict and editor workflow behavior now live behind renderer controllers; `App.tsx` is a composition/orchestration root and `WorkspaceShell` is a callback-driven presentation shell.
- Closed: false workspace-open typing. Product/test bridge contracts now use shared result types that include open-file failure payloads.
- Closed: stale design baseline. `docs/design.md` now describes the current tabbed workspace baseline and moves crash/session recovery back to backlog.
- Closed: oversized preload bridge. Product bridge and test bridge are split into `window.fishmark` and `window.fishmarkTest`, with preload mode selection in shared contract code.
- Closed: theme fixture private selector dependency. Bundled theme fixtures now target public `data-fishmark-surface` / `data-fishmark-theme-surface` hooks instead of shell-private selectors.

## Verification

- `npm run test -- src/main/workspace-service.test.ts src/main/workspace-application.test.ts src/main/workspace-close-coordinator.test.ts src/preload/preload.contract.test.ts src/preload/preload.test.ts src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useSaveController.test.tsx src/renderer/editor/useExternalConflictController.test.tsx src/renderer/editor/WorkspaceShell.test.tsx src/renderer/app.autosave.test.ts` passed: 10 files, 190 tests.
- `npm run lint` passed with one existing Fast Refresh warning in `src/renderer/editor/App.tsx`.
- `npm run typecheck` passed.
- `npm run build` passed with the existing Vite chunk-size warning.
- `npm run test` passed: 84 files, 802 tests.

## Residual Risks

- `WorkspaceShellProps` remains broad. It is presentation-only after review fixes, but future shell work should split it by workspace chrome, editor canvas, settings drawer and theme surface host.
- `src/renderer/editor/App.tsx` still exports `isFocusedEditorInteractiveElement` for tests, which keeps the existing Fast Refresh lint warning.
- Vite still reports a large `App` chunk. This is unchanged by the architecture reset.
- `package-lock.json` has an unrelated uncommitted dirty change in this worktree. It was intentionally not staged or committed.

## Suggested Next Step

- Run the final code-review pass across the branch diff, then choose whether to merge, open a PR, or keep the branch for another cleanup slice.
