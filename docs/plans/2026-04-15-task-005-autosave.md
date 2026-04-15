# TASK-005 Autosave Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full autosave for already opened Markdown documents, including idle-triggered save, blur-triggered save, distinct autosave/manual-save status, and failure-safe behavior that preserves in-memory edits.

**Architecture:** Reuse the existing `TASK-004` save bridge and `TASK-007` CodeMirror ownership boundary. Keep autosave policy in renderer shell, extend pure document state to distinguish save origins, and let editor code expose only change and blur events. Do not create a second persistence path or move save dialogs into autosave.

**Tech Stack:** Electron, React, TypeScript, CodeMirror 6, Vitest

---

### Task 1: Extend pure document state for autosave semantics

**Files:**
- Modify: `src/renderer/document-state.ts`
- Modify: `src/renderer/document-state.test.ts`

**Step 1: Write the failing tests**

Add tests for:
- `startManualSavingDocument()` sets `saveState` to `"manual-saving"`
- `startAutosavingDocument()` sets `saveState` to `"autosaving"`
- autosave success clears dirty and snapshots the saved content
- autosave failure keeps dirty and stores a safe autosave error

Use a result shape like:

```ts
const result = {
  status: "error" as const,
  error: {
    code: "write-failed" as const,
    message: "Autosave failed. Changes are still in memory."
  }
};
```

**Step 2: Run the targeted test to verify it fails**

Run: `npm run test -- src/renderer/document-state.test.ts`
Expected: FAIL because `saveState` still uses `"saving"` and autosave-specific transitions do not exist.

**Step 3: Write the minimal implementation**

Update `src/renderer/document-state.ts` to:
- change `SaveState` to `"idle" | "manual-saving" | "autosaving"`
- replace `startSavingDocument()` with:

```ts
export function startManualSavingDocument(currentState: AppState): AppState
export function startAutosavingDocument(currentState: AppState): AppState
```

- keep `applySaveMarkdownResult()` deterministic and pure
- allow autosave callers to provide the failure message that should be surfaced

**Step 4: Run the targeted test to verify it passes**

Run: `npm run test -- src/renderer/document-state.test.ts`
Expected: PASS

### Task 2: Expose editor blur without moving persistence into the editor

**Files:**
- Modify: `src/renderer/code-editor.ts`
- Modify: `src/renderer/code-editor-view.tsx`
- Modify: `src/renderer/code-editor.test.ts`

**Step 1: Write the failing test**

Add a test that creates the editor, focuses its DOM, dispatches blur, and expects a renderer-provided callback to run:

```ts
const onBlur = vi.fn();
createCodeEditorController({ parent: host, initialContent: "", onChange: vi.fn(), onBlur });
```

**Step 2: Run the targeted test to verify it fails**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: FAIL because the editor controller does not yet accept or emit `onBlur`.

**Step 3: Write the minimal implementation**

Update the editor boundary to:
- add `onBlur?: () => void` to controller/view options
- wire blur from the editor DOM back to the renderer shell
- avoid putting any save or timer behavior into editor code

**Step 4: Run the targeted test to verify it passes**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: PASS

### Task 3: Add autosave orchestration tests around the app shell

**Files:**
- Create: `src/renderer/app.autosave.test.ts`
- Reference: `src/renderer/App.tsx`

**Step 1: Write the failing tests**

Create renderer tests with fake timers that stub `window.yulora` and cover:
- idle autosave fires after the debounce delay
- repeated typing resets the timer so only one autosave is sent
- blur triggers autosave immediately
- autosave does not start while a save is in progress
- editing during an in-flight autosave schedules exactly one replay autosave after completion
- manual save clears pending autosave
- a clean opened document does not autosave

Use `createRoot()` and `act()` so the test drives the real `App` behavior without adding new libraries.

**Step 2: Run the targeted test to verify it fails**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL because `App.tsx` does not yet manage autosave timers, blur handling, or replay gating.

**Step 3: Write the minimal test scaffolding**

In the new test file:
- stub `window.yulora.openMarkdownFile`, `saveMarkdownFile`, `saveMarkdownFileAs`, and `onMenuCommand`
- mock the editor view if needed so tests can drive `onChange` and `onBlur`
- use `vi.useFakeTimers()`

**Step 4: Keep the tests failing for the right reason**

Re-run:
- `npm run test -- src/renderer/app.autosave.test.ts`

Expected: FAIL because autosave behavior is still missing, not because of broken test setup.

### Task 4: Implement autosave scheduling in the app shell

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/types.d.ts` only if test/setup typing needs adjustment

**Step 1: Add a small renderer-only autosave runtime**

Inside `App.tsx`, add refs for:
- current editor text snapshot
- idle timer handle
- whether a replay autosave is pending after the current save
- whether the current in-flight save is manual or autosave

Use a fixed debounce constant such as:

```ts
const AUTOSAVE_IDLE_MS = 1000;
```

**Step 2: Reuse the existing save bridge for autosave**

Implement a shared internal save helper that:
- reads the current editor content
- chooses manual or autosave state transition
- calls `window.yulora.saveMarkdownFile()`
- clears or preserves dirty state via `applySaveMarkdownResult()`
- handles replay autosave after completion if needed

**Step 3: Trigger autosave from change and blur**

Update the existing editor `onChange` flow to:
- update the editor content ref
- update `isDirty`
- reset the idle autosave timer

Pass `onBlur` into `CodeEditorView` and trigger the same autosave helper immediately when dirty.

**Step 4: Protect manual Save / Save As**

Before manual save actions:
- clear pending autosave timers
- mark that autosave replay should not race the manual operation
- keep `Save As` outside autosave entirely

**Step 5: Run the app autosave tests**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: PASS

### Task 5: Verify state and editor regressions together

**Files:**
- Modify: `src/renderer/document-state.test.ts` only if additional edge cases are still missing
- Modify: `src/renderer/code-editor.test.ts` only if the new blur path reveals test gaps

**Step 1: Run focused renderer regression tests**

Run:
- `npm run test -- src/renderer/document-state.test.ts src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`

Expected: PASS

**Step 2: Tighten any missing assertions**

If needed, add assertions for:
- autosave failure leaves `isDirty=true`
- manual save still wins over pending autosave
- opening a new document resets autosave runtime state

### Task 6: Update records and run full gates

**Files:**
- Modify: `docs/test-cases.md`
- Modify: `docs/test-report.md`
- Modify: `docs/decision-log.md`
- Modify: `docs/progress.md`
- Create: `reports/task-summaries/TASK-005.md`

**Step 1: Update manual/regression coverage docs**

Record:
- the autosave trigger rules
- blur autosave behavior
- failure-safe expectations

**Step 2: Run verification**

Run:
- `npm run test -- src/renderer/document-state.test.ts src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Expected:
- all commands pass

**Step 3: Update project records**

Write:
- the decision to keep autosave in renderer shell while reusing the main-process save bridge
- fresh test/build evidence
- `TASK-005` status progression
- a short task summary with delivered scope and remaining out-of-scope items

**Step 4: Manual acceptance**

Run `npm run dev` and verify:
- open an existing `.md` file
- type, stop for the debounce window, and confirm the file updates on disk
- type again, move focus out of the editor, and confirm blur autosave runs
- simulate a save failure and confirm the current text remains visible and the document stays dirty
- confirm manual `Save` and `Save As` still behave correctly
