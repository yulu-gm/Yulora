# TASK-009 Active Block Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track the active top-level Markdown block from the current CodeMirror selection so later block-rendering tasks can safely switch behavior per block.

**Architecture:** Keep block resolution logic in `packages/editor-core/` as a pure layer that depends only on source text, `parseBlockMap()`, and selection offsets. Extend the existing renderer-side editor controller with a narrow `onActiveBlockChange` hook so React can observe the active block without owning editor internals or reparsing document state itself.

**Tech Stack:** TypeScript, CodeMirror 6, React, micromark block map, Vitest, ESLint

---

### Task 1: Add failing tests for pure active-block resolution

**Files:**
- Create: `packages/editor-core/src/active-block.test.ts`
- Create: `packages/editor-core/src/index.ts`

**Step 1: Write the first failing resolver test**

Assert that a mixed Markdown source resolves the expected `heading`, `paragraph`, `list`, or `blockquote` block when given a cursor offset inside each block.

**Step 2: Add boundary-focused failing tests**

Cover:
- cursor at the exact start of a block
- cursor on the trailing newline at block end
- cursor in blank space between blocks returns `null`
- empty input returns `null`

**Step 3: Run the targeted test to verify failure**

Run: `npm run test -- packages/editor-core/src/active-block.test.ts`
Expected: FAIL because the resolver module does not exist yet.

### Task 2: Implement the minimal pure resolver in `packages/editor-core`

**Files:**
- Create: `packages/editor-core/src/active-block.ts`
- Modify: `packages/editor-core/src/index.ts`

**Step 1: Add the narrow type surface**

Export:
- an `ActiveBlock` type carrying the resolved `MarkdownBlock`
- a pure resolver that accepts Markdown source and selection offset
- a helper that resolves from an existing parsed `BlockMap` to avoid duplicate parser assumptions in tests

**Step 2: Implement the smallest matching algorithm**

Use the existing top-level block offsets from `parseBlockMap()` and resolve the block whose half-open range contains the selection anchor. Treat gaps between blocks as no active block.

**Step 3: Re-run the targeted test**

Run: `npm run test -- packages/editor-core/src/active-block.test.ts`
Expected: PASS

### Task 3: Add failing editor-controller tests for selection-driven updates

**Files:**
- Modify: `src/renderer/code-editor.test.ts`

**Step 1: Add a failing integration-style unit test**

Create a real editor controller with mixed Markdown content, move the selection with a transaction, and assert that `onActiveBlockChange` receives the expected block ids in order.

**Step 2: Add a non-regression test**

Verify that replacing the document recalculates the active block for the new content without requiring user typing.

**Step 3: Run the targeted test**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: FAIL because the controller does not expose active-block updates yet.

### Task 4: Wire active-block updates through the CodeMirror controller and React boundary

**Files:**
- Modify: `src/renderer/code-editor.ts`
- Modify: `src/renderer/code-editor-view.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/app.autosave.test.ts` only if the new prop surface requires mock updates

**Step 1: Extend the controller API minimally**

Add:
- `onActiveBlockChange` callback to controller creation options
- `getActiveBlock()` on the controller/handle if needed by React

Keep the active-block source of truth inside the editor controller, not in the React document reducer.

**Step 2: Publish updates only when the active block actually changes**

Hook into CodeMirror updates so:
- selection changes recompute the active block
- doc changes recompute against the new source
- duplicate notifications for the same block id are avoided

**Step 3: Reflect current block info in renderer state**

Store only the currently resolved block metadata needed by future rendering work. Do not add visible UI for it in `TASK-009`.

**Step 4: Re-run targeted tests**

Run:
- `npm run test -- src/renderer/code-editor.test.ts`
- `npm run test -- src/renderer/app.autosave.test.ts`

Expected:
- both PASS

### Task 5: Verify repo gates and update task records

**Files:**
- Modify: `docs/decision-log.md`
- Modify: `docs/test-report.md`
- Modify: `docs/progress.md`
- Create: `reports/task-summaries/TASK-009.md`
- Modify: `MVP_BACKLOG.md`

**Step 1: Update backlog slice checkboxes**

Mark the `TASK-009` execution slices complete if implementation and verification are done.

**Step 2: Record the active-block boundary decision**

Document that:
- `TASK-009` adds internal active-block state only
- no visible rendering behavior ships yet
- the editor controller remains the bridge between CodeMirror internals and renderer state

**Step 3: Run full verification**

Run:
- `npm run test -- packages/editor-core/src/active-block.test.ts`
- `npm run test -- src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Expected:
- all commands pass

**Step 4: Write the task summary**

Capture:
- what changed
- what was verified
- residual risks for `TASK-010` and later block-rendering work
