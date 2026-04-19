# Reading / Editing Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old focus mode with explicit reading and editing modes across the renderer shell, settings, runtime env, and regression tests.

**Architecture:** Keep the editor mounted and move shell behavior to one runtime mode state in `App.tsx`. Remove persisted focus preferences entirely, drive reading mode chrome through data attributes, and rename theme runtime inputs from focus to reading without a compatibility shim.

**Tech Stack:** React, TypeScript, Vitest, Electron renderer shell, CSS data-attribute layout state

---

### Task 1: Lock the new mode behavior with failing renderer tests

**Files:**
- Modify: `src/renderer/app.autosave.test.ts`
- Test: `src/renderer/app.autosave.test.ts`

- [ ] Add failing tests for:
  - existing document defaults to reading mode
  - untitled document defaults to editing mode
  - clicking the editor body enters editing mode
  - pressing `Escape` exits editing mode
  - clicking the document-canvas blank area exits editing mode
  - reading mode hides rail, header, status bar, and outline while preserving editor mount
- [ ] Run: `npm run test -- src/renderer/app.autosave.test.ts`
- [ ] Confirm the new assertions fail for the expected reasons.

### Task 2: Replace the renderer shell focus state with reading/editing mode

**Files:**
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/styles/app-ui.css`
- Test: `src/renderer/app.autosave.test.ts`

- [ ] Introduce `shellMode: "reading" | "editing"` in `App.tsx`.
- [ ] Remove focus toggle, idle timer, pointer/keyboard auto-focus logic, and focus settings wiring.
- [ ] Make open existing documents default to reading mode and new untitled documents default to editing mode.
- [ ] Enter editing mode on editor-body focus/click.
- [ ] Exit editing mode on `Escape` and document-canvas blank clicks.
- [ ] Hide rail, header, status bar, and outline in reading mode.
- [ ] Update layout CSS so reading mode releases the rail column and keeps the workspace visually centered.
- [ ] Re-run: `npm run test -- src/renderer/app.autosave.test.ts`

### Task 3: Remove obsolete focus preferences and settings UI

**Files:**
- Modify: `src/shared/preferences.ts`
- Modify: `src/shared/preferences.test.ts`
- Modify: `src/renderer/editor/settings-view.tsx`
- Test: `src/shared/preferences.test.ts`
- Test: `src/renderer/app.autosave.test.ts`

- [ ] Delete the `focus` preference model and normalization logic.
- [ ] Remove focus-related settings controls and tests.
- [ ] Update defaults, merge behavior, and serialization expectations.
- [ ] Run: `npm run test -- src/shared/preferences.test.ts src/renderer/app.autosave.test.ts`

### Task 4: Rename theme runtime focus inputs to reading mode

**Files:**
- Modify: `src/shared/theme-style-contract.ts`
- Modify: `src/renderer/theme-runtime-env.ts`
- Modify: `src/renderer/shader/theme-scene-state.ts`
- Modify: `src/renderer/editor/ThemeSurfaceHost.tsx`
- Modify: `src/renderer/editor/ThemeSurfaceHost.test.tsx`
- Modify: `src/renderer/shader/theme-scene-state.test.ts`
- Modify: `src/renderer/shader/theme-surface-runtime.test.ts`
- Modify: `src/renderer/theme-package-runtime.test.ts`
- Modify: `src/renderer/app.autosave.test.ts`

- [ ] Rename runtime env fields / CSS vars / uniform plumbing from `focusMode` to `readingMode`.
- [ ] Keep the runtime contract binary: `0` for editing, `1` for reading.
- [ ] Re-run focused tests:
  - `npm run test -- src/renderer/shader/theme-scene-state.test.ts src/renderer/shader/theme-surface-runtime.test.ts src/renderer/editor/ThemeSurfaceHost.test.tsx src/renderer/theme-package-runtime.test.ts src/renderer/app.autosave.test.ts`

### Task 5: Update product docs and run full verification

**Files:**
- Modify: `docs/design.md`
- Modify: any affected `docs/superpowers/specs/*` references if implementation reveals naming drift
- Modify: `docs/test-report.md`
- Modify: `reports/task-summaries/TASK-*.md` or add the relevant summary at completion time

- [ ] Update user-visible design docs to reference reading/editing modes instead of focus mode.
- [ ] Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- [ ] Record verification evidence and task summary.
