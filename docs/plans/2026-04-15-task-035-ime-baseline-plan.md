# TASK-035 IME Baseline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a composition-safe guard around editor-derived state so IME input can proceed without disruptive active-block recalculation during composition.

**Architecture:** Keep document text updates and save/autosave behavior unchanged. Add a narrow composition guard inside the CodeMirror controller that defers block-map and active-block recomputation until composition ends, then flush once from the final editor state.

**Tech Stack:** Electron, React, TypeScript, CodeMirror 6, Vitest, jsdom

---

### Task 1: Lock the IME guard contract in renderer tests

**Files:**
- Modify: `src/renderer/code-editor.test.ts`

**Step 1: Write the failing tests**

- Add a test that starts composition, applies a doc change inside a paragraph, and asserts `onActiveBlockChange` does not emit a new derived update until composition ends.
- Add a test that does the same for a heading document and verifies the final committed content remains intact.
- Add a test that does the same for a list document and verifies the final active block still resolves to `list` after flush.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: FAIL because the current controller recomputes and emits during composition.

**Step 3: Write minimal implementation**

- Extend the controller with composition lifecycle tracking.
- Defer block-map and active-block recomputation while composition is active.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: PASS

### Task 2: Implement the composition guard in the controller

**Files:**
- Modify: `src/renderer/code-editor.ts`

**Step 1: Add the smallest guard state**

- Track whether composition has started.
- Track whether a flush is pending.

**Step 2: Wire composition DOM events**

- Listen for `compositionstart`, `compositionupdate`, and `compositionend` on the editor DOM.
- Keep `onChange` behavior unchanged.

**Step 3: Flush derived state once**

- On composition end, recompute block map from `view.state.doc`.
- Rebuild active-block state from current selection.
- Emit exactly one post-composition update when needed.

**Step 4: Re-run focused tests**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: PASS

### Task 3: Verify adjacent renderer behavior stays intact

**Files:**
- Modify only if needed: `src/renderer/code-editor-view.tsx`
- Test: `src/renderer/app.autosave.test.ts`

**Step 1: Run regression tests without changing behavior**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: PASS

**Step 2: Only patch wiring if tests expose a regression**

- Keep any fix localized to preserving existing `onChange`/`onBlur` behavior.

### Task 4: Document the baseline and hand off to acceptance

**Files:**
- Modify: `docs/decision-log.md`
- Modify: `docs/test-report.md`
- Modify: `docs/progress.md`
- Modify: `MVP_BACKLOG.md`
- Create: `docs/plans/2026-04-15-task-035-handoff.md`
- Create: `reports/task-summaries/TASK-035.md`

**Step 1: Update docs after code is green**

- Record the composition-guard decision and current limitations.
- Update backlog execution slice checkboxes that are completed this round.
- Move `docs/progress.md` only if task state truly changed.

**Step 2: Run task-level verification**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test -- src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`
- `npm run test`
- `npm run build`

Expected: PASS, or explicit note if sandbox constraints require escalated rerun.

**Step 3: Write execution handoff**

- Summarize what changed
- List touched files
- Recommend acceptance verification
- Record known risks and uncovered IME scenarios
