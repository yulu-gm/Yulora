# Yulora Refactor Review Follow-Ups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the confirmed regressions introduced by the structure refactor and finish the highest-value structural cleanup items without reopening the larger editor architecture migration.

**Architecture:** Treat the external review in two buckets. First, fix correctness regressions immediately: the workbench mojibake separator and the preload/shared test-command contract drift. Second, tighten the refactor seams that are still duplicated or too leaky: runtime-mode dispatch, markdown Enter/Backspace glue, and the editor-core public surface. Explicitly defer the larger `createYuloraMarkdownExtensions()` extraction until a separate slice because it would mix host-lifecycle changes with API cleanup.

**Tech Stack:** Electron, React 19, TypeScript 5.9, CodeMirror 6, Vite, Vitest

---

## Scope Decisions

- Do fix the confirmed user-visible regression in `src/renderer/workbench/App.tsx`.
- Do eliminate the stale duplicate `EditorTestCommand` types from preload so the shared contract has a single source of truth.
- Do collapse renderer runtime-mode dispatch to one production path.
- Do extract shared Enter/Backspace command chains into `packages/editor-core`.
- Do narrow the `packages/editor-core` public barrel and move the misnamed derived-state helper out of `plugins/`.
- Do **not** implement the larger `createYuloraMarkdownExtensions()` factory in this slice.
- Do **not** broaden this slice into unrelated UX or package-layout work.

## Task List

### Task 1: Fix Workbench Separator Encoding Regression

**Recommended Model:** `gpt-5.4-mini` or `gpt-5.3-codex-spark`

**Files:**
- Modify: `src/renderer/workbench/App.tsx`
- Modify: `src/renderer/test-workbench.test.tsx`

**Step 1: Add a focused regression assertion**

Extend the existing workbench terminal-failure test so it asserts the rendered copy contains the expected middle-dot separators, for example:

```ts
expect(container.textContent).toContain("step · launch-dev-shell · boom");
```

Also add a step metadata assertion so the list item shows:

```ts
expect(container.textContent).toContain("Launch shell · setup");
```

**Step 2: Run the focused test before implementation**

Run: `npm run test -- src/renderer/test-workbench.test.tsx`

Expected: FAIL because the current UI renders mojibake instead of ` · `.

**Step 3: Restore the correct separator in the workbench UI**

Replace the corrupted string literals in `src/renderer/workbench/App.tsx` with ASCII-safe JSX text or a shared local constant:

```tsx
const META_SEPARATOR = " · ";
```

Use that constant in both the terminal error row and the step metadata row.

**Step 4: Re-run the focused UI test**

Run: `npm run test -- src/renderer/test-workbench.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/workbench/App.tsx src/renderer/test-workbench.test.tsx
git commit -m "fix: restore workbench metadata separators"
```

### Task 2: Unify Preload Editor Test Command Types With Shared Contract

**Recommended Model:** `gpt-5.4-mini` or `gpt-5.3-codex-spark`

**Files:**
- Modify: `src/preload/preload.ts`
- Modify: `src/preload/preload.contract.test.ts`
- Modify: `src/renderer/types.d.ts`

**Step 1: Write a contract-drift test that fails against the current preload typing**

Add coverage in `src/preload/preload.contract.test.ts` for both missing command variants:

```ts
const selectionCommandPayload: EditorTestCommandEnvelope = {
  sessionId: "session-1",
  commandId: "command-1",
  command: { type: "set-editor-selection", anchor: 4, head: 7 }
};
```

and

```ts
const enterCommandPayload: EditorTestCommandEnvelope = {
  sessionId: "session-1",
  commandId: "command-2",
  command: { type: "press-editor-enter" }
};
```

Add a type-level assertion by importing the exposed bridge type and shared type into the test file:

```ts
type PreloadEditorListener = Parameters<Window["yulora"]["onEditorTestCommand"]>[0];
type PreloadEditorEnvelope = Parameters<PreloadEditorListener>[0];
type _AssertSharedToPreload =
  EditorTestCommandEnvelope extends PreloadEditorEnvelope ? true : never;
type _AssertPreloadToShared =
  PreloadEditorEnvelope extends EditorTestCommandEnvelope ? true : never;
```

**Step 2: Run the preload contract test**

Run: `npm run test -- src/preload/preload.contract.test.ts`

Expected: FAIL or typecheck failure while preload still carries the stale local union.

**Step 3: Remove the duplicated local preload command types**

In `src/preload/preload.ts`, delete the local `EditorTestCommand`, `EditorTestCommandEnvelope`, and `EditorTestCommandResultEnvelope` definitions. Replace them with:

```ts
import type {
  EditorTestCommandEnvelope,
  EditorTestCommandResultEnvelope
} from "../shared/editor-test-command";
```

Keep the string channel constants local in preload for sandbox safety, but reuse shared payload types.

**Step 4: Re-run focused verification**

Run:
- `npm run test -- src/preload/preload.contract.test.ts`
- `npm run typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add src/preload/preload.ts src/preload/preload.contract.test.ts src/renderer/types.d.ts
git commit -m "fix: align preload editor test command contract"
```

### Task 3: Make `App.tsx` The Only Runtime Dispatch Point

**Recommended Model:** `gpt-5.4-mini` or `gpt-5.3-codex-spark`

**Files:**
- Modify: `src/renderer/main.tsx`
- Optional Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/app.autosave.test.ts`
- Modify: `src/renderer/test-workbench.test.tsx`

**Step 1: Update tests to target the true production entrypoint**

If the current tests still mount `App` directly, keep them there. Add or adjust one light integration assertion that proves the workbench route still renders through `App`.

**Step 2: Simplify the runtime bootstrap**

Change `src/renderer/main.tsx` to render the existing `App` wrapper directly:

```tsx
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`App.tsx` remains the single place that calls `resolveRuntimeMode(...)`.

**Step 3: Run focused renderer tests**

Run:
- `npm run test -- src/renderer/app.autosave.test.ts`
- `npm run test -- src/renderer/test-workbench.test.tsx`

Expected: PASS

**Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/main.tsx src/renderer/App.tsx src/renderer/app.autosave.test.ts src/renderer/test-workbench.test.tsx
git commit -m "refactor: centralize renderer runtime dispatch"
```

### Task 4: Deduplicate Markdown Enter And Backspace Glue

**Recommended Model:** `gpt-5.4`

**Files:**
- Modify: `packages/editor-core/src/commands/index.ts`
- Modify: `packages/editor-core/src/commands/code-fence-commands.ts`
- Optional Create: `packages/editor-core/src/commands/markdown-commands.ts`
- Modify: `packages/editor-core/src/index.ts`
- Modify: `src/renderer/code-editor.ts`
- Modify: `src/renderer/code-editor.test.ts`

**Step 1: Add focused command-composition tests**

Keep the behavioral tests in `src/renderer/code-editor.test.ts`, but add one lightweight unit target for the new wrapper helpers if a separate `markdown-commands.ts` file is introduced.

At minimum, confirm both the keymap path and imperative controller path still use the same composed behavior for:
- list continuation
- blockquote continuation
- fenced-code auto-close
- fenced-code backspace reveal

**Step 2: Run the relevant editor suite before implementation**

Run: `npm run test -- src/renderer/code-editor.test.ts`

Expected: PASS on baseline.

**Step 3: Extract shared composed helpers**

Expose two small renderer-facing helpers from `packages/editor-core`, for example:

```ts
export function runMarkdownEnter(view: EditorView, activeState: ActiveBlockState): boolean;
export function runMarkdownBackspace(view: EditorView, activeState: ActiveBlockState): boolean;
```

Implementation should internally compose:
- `runCodeFenceEnter`
- `runListEnter`
- `runBlockquoteEnter`
- `insertNewlineAndIndent`

and:
- `runCodeFenceBackspace`
- `deleteCharBackward`

Then update both the keymap handlers and `pressEnter()` / `pressBackspace()` in `src/renderer/code-editor.ts` to call those shared helpers.

**Step 4: Re-run the editor behavior suite**

Run:
- `npm run test -- src/renderer/code-editor.test.ts`
- `npm run typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/editor-core/src/commands packages/editor-core/src/index.ts src/renderer/code-editor.ts src/renderer/code-editor.test.ts
git commit -m "refactor: share markdown enter and backspace handlers"
```

### Task 5: Narrow The Editor-Core Public Surface And Rename The Misplaced Derived-State Helper

**Recommended Model:** `gpt-5.4`

**Files:**
- Move: `packages/editor-core/src/plugins/inactive-block-decorations.ts` -> `packages/editor-core/src/derived-state/inactive-block-decorations.ts`
- Modify: `packages/editor-core/src/plugins/inactive-block-decorations.test.ts`
- Modify: `packages/editor-core/src/index.ts`
- Modify: `src/renderer/code-editor.ts`
- Modify any internal imports under `packages/editor-core/src/*`

**Step 1: Rename the derived-state helper to match what it actually is**

Move the file from `plugins/` into `derived-state/` and update its import sites. Keep the exported function name stable unless the rename improves clarity with low churn.

**Step 2: Shrink the public barrel**

Remove internal-only exports from `packages/editor-core/src/index.ts`, including:
- `createBlockDecorationSignature`
- `getBlockLineInfos`
- `getInactiveBlockquoteLines`
- `getInactiveCodeFenceLines`
- `getInactiveHeadingMarkerEnd`
- `buildContinuationPrefix`
- `getBackspaceLineStart`
- `getCodeFenceEditableAnchor`
- `parseBlockquoteLine`
- `parseCodeFenceLine`
- `parseListLine`
- `ParsedListLine`

Keep only the public surface the renderer actually needs.

**Step 3: Run focused verification**

Run:
- `npm run test -- packages/editor-core/src/plugins/inactive-block-decorations.test.ts src/renderer/code-editor.test.ts`
- `npm run typecheck`

Expected: PASS after import paths are updated.

If the test file moves with the implementation file, update the command accordingly.

**Step 4: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/editor-core/src/index.ts packages/editor-core/src/derived-state packages/editor-core/src/plugins src/renderer/code-editor.ts
git commit -m "refactor: narrow editor core public API"
```

## Deferred Item

The external review item about exporting a full `createYuloraMarkdownExtensions()` bundle from `packages/editor-core` is valid, but it is intentionally deferred. That change would absorb:
- CodeMirror `StateField` ownership
- focus/blur lifecycle wiring
- composition guards
- host callback plumbing

That is a distinct architectural slice and should not be mixed with this follow-up cleanup.

## Verification Matrix

After all five tasks land, run the full checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected:
- workbench copy renders the intended ` · ` separators
- preload bridge command payload types stay aligned with `src/shared/editor-test-command.ts`
- renderer bootstrap goes through a single dispatch point
- `code-editor.ts` no longer duplicates Enter/Backspace command chains
- `packages/editor-core` exposes a narrower, less brittle API surface

## Recommended Execution Order

1. Task 1 first because it fixes a visible regression.
2. Task 2 second because it removes a silent contract bug.
3. Task 3 next because it is a small structural cleanup with low risk.
4. Task 4 after that because it changes live editor behavior glue and needs focused review.
5. Task 5 last because it is largely internal cleanup once imports have stabilized.
