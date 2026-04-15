# TASK-005 Autosave Design

## Scope

Task: `TASK-005`  
Goal: Add autosave for an already opened Markdown document so edits are written to disk after typing stops or when the editor loses focus, without losing in-memory changes when a save fails.

In scope:
- Autosave for already opened documents that already have a file path
- Idle-triggered autosave after typing stops for a fixed debounce window
- Blur-triggered autosave when the editor loses focus while dirty
- Reuse of the existing `saveMarkdownFile()` main/preload save chain
- Distinct UI feedback for manual save vs autosave in progress
- Failure-safe behavior that keeps the current in-memory text and dirty state
- Tests covering autosave timing, blur behavior, save gating, and failure handling

Out of scope:
- Untitled new-document save flows
- Crash recovery and snapshot restore
- Window-close interception
- Recent files
- Block rendering, micromark parsing, or IME-specific fixes beyond preserving current behavior

## Current Constraints

- All filesystem access must remain in `src/main/`
- `preload` may only expose the minimum safe bridge surface
- The current save implementation in `TASK-004` already provides the only supported write-to-disk path
- The current editor architecture from `TASK-007` keeps editable text inside CodeMirror while renderer shell state only tracks persisted metadata, dirty state, and save state
- Autosave must not rewrite the whole Markdown document differently from manual save; it must write the current editor text verbatim

## Approaches Considered

### Option 1: Renderer schedules autosave, main keeps writing

Let renderer own autosave timing, blur handling, and "one save at a time" gating. When autosave actually fires, it calls the existing `window.yulora.saveMarkdownFile()` bridge with the current CodeMirror content.

Pros:
- Reuses the existing save chain without widening process boundaries
- Keeps persistence in `main` and interaction timing in `renderer`
- Smallest diff against `TASK-004` and `TASK-007`
- Easiest way to distinguish manual save vs autosave in the UI

Cons:
- Renderer needs a slightly richer autosave state machine

### Option 2: Move autosave scheduling into main

Let renderer stream dirty events and content snapshots to `main`, which then owns the autosave timers and writes.

Pros:
- All persistence-related concerns live near the write path

Cons:
- Requires broader IPC and more cross-process timing coordination
- Couples main-process behavior to renderer editing cadence
- Higher risk of turning autosave into an accidental architecture expansion

### Option 3: Put autosave directly inside the CodeMirror controller

Let the editor wrapper manage timers and save behavior close to the source edit events.

Pros:
- Trigger source is close to the editor

Cons:
- Mixes persistence policy into the editor boundary
- Makes later editor work harder to reason about
- Increases coupling between CodeMirror integration and file lifecycle behavior

Recommendation: choose Option 1.

## Recommended Architecture

Autosave will remain a renderer-shell concern that reuses the existing save bridge.

- `src/main/` and `src/preload/` do not gain a second write path. Autosave uses the same `SAVE_MARKDOWN_FILE_CHANNEL` handler as manual save.
- `src/renderer/document-state.ts` continues to own pure document facts, but it will distinguish `"manual-saving"` from `"autosaving"` so UI and tests can tell which path is running.
- `src/renderer/App.tsx` will coordinate autosave timing and trigger rules around the existing open/save handlers.
- `src/renderer/code-editor.ts` and `src/renderer/code-editor-view.tsx` stay responsible for editor events only. They may expose a blur callback, but they must not own persistence.

This keeps the architecture aligned with current boundaries:
- editing semantics in CodeMirror
- file writes in `main`
- document lifecycle and autosave policy in renderer shell

## State Model

`AppState` should continue to track only durable shell state:

- `currentDocument`
- `editorLoadRevision`
- `openState`
- `saveState`
- `isDirty`
- `errorMessage`
- `lastSavedContent`

`saveState` changes from:
- `"idle" | "saving"`

to:
- `"idle" | "manual-saving" | "autosaving"`

Rules:
- opening a document resets `isDirty=false`, `errorMessage=null`, and `saveState="idle"`
- editing compares current editor text with `lastSavedContent`
- manual save success updates `lastSavedContent`, clears `isDirty`, and sets `saveState="idle"`
- autosave success does the same
- manual save failure keeps `isDirty=true`, resets `saveState="idle"`, and shows the standard save error
- autosave failure keeps `isDirty=true`, resets `saveState="idle"`, and shows an autosave-specific error that makes it explicit the text still exists in memory

Autosave timers and "save again after current save finishes" flags should not live in `AppState`. They belong in renderer runtime refs or a small renderer-only helper used by `App.tsx`.

## Trigger Rules

Autosave applies only when all of these are true:
- a document is currently open
- that document already has a concrete path
- the document is dirty
- there is no current manual save or autosave in flight

Two triggers are supported:

### Idle autosave

After each document change, renderer resets an autosave timer. When the timer expires, autosave runs if the gating conditions still hold.

### Blur autosave

When the editor loses focus and the document is still dirty, renderer attempts autosave immediately using the same gating rules.

## Save Concurrency and Replay Rules

Only one write may be in flight at a time.

- If autosave is running and more edits happen, do not start a second write in parallel.
- Instead, mark that another autosave pass is needed after the current save completes.
- When the current save finishes, re-check `isDirty`. If content still differs from `lastSavedContent`, trigger one more autosave immediately.
- Manual save takes precedence over pending autosave timers:
  - clear pending autosave timers before manual `Save` or `Save As`
  - if manual save succeeds, do not replay autosave
  - if manual save fails, leave the document dirty and allow later autosave attempts

`Save As` is not part of autosave. Autosave never opens a dialog or changes the current path.

## Data Flow

### Edit

1. User edits inside CodeMirror
2. CodeMirror emits the latest text through the existing `onChange` callback
3. `App.tsx` updates the current editor snapshot ref
4. `applyEditorContentChanged()` updates `isDirty`
5. Renderer resets the autosave idle timer

### Idle autosave

1. Idle timer expires
2. Renderer checks open-path, dirty, and in-flight save gates
3. Renderer reads the latest editor text
4. Renderer calls `window.yulora.saveMarkdownFile({ path, content })`
5. On success, renderer updates `lastSavedContent`, clears dirty, and returns to `"idle"`
6. On failure, renderer preserves dirty state and shows a non-destructive autosave error

### Blur autosave

1. Editor emits blur
2. Renderer checks the same autosave gates
3. Renderer calls the same `saveMarkdownFile()` bridge immediately
4. State transitions are identical to idle autosave

### Manual save

1. User triggers `Save` or `Save As`
2. Renderer clears pending autosave timers
3. Renderer starts `"manual-saving"`
4. Existing save/save-as path runs unchanged
5. On success, persisted snapshot updates and autosave replay is skipped
6. On failure, dirty state remains and later autosave is still allowed

## UI Feedback

Status text should be minimal and stable:

- manual save in progress: `Saving changes...`
- autosave in progress: `Autosaving...`
- dirty but not saving: `Unsaved changes`
- clean and idle: `All changes saved`

Error handling:
- manual save failure may continue using the existing general save error text
- autosave failure should clearly communicate safety, for example:
  - `Autosave failed. Changes are still in memory.`

Autosave success should not introduce a new persistent success banner. Once the save finishes, the UI should simply return to `All changes saved`.

## Testing Strategy

Start with failing tests.

### Renderer state tests

Extend `src/renderer/document-state.test.ts` to cover:
- autosave start enters `"autosaving"`
- manual save start enters `"manual-saving"`
- autosave success clears dirty and snapshots saved content
- autosave failure keeps dirty and records the autosave-safe error

### Editor boundary tests

Extend `src/renderer/code-editor.test.ts` to cover:
- editor blur is exposed back to the renderer shell
- editor boundary still does not perform any save work itself

### Autosave orchestration tests

Add a renderer autosave orchestration test to cover:
- idle autosave fires after the debounce window
- repeated typing resets the timer so only one autosave happens
- blur triggers autosave immediately
- autosave never starts while another save is in progress
- edits during an in-flight autosave cause exactly one replay save after completion
- manual save clears pending autosave
- clean newly opened documents do not autosave

### Verification gates

- `npm run test -- src/renderer/document-state.test.ts src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Acceptance

- After editing an already opened Markdown file and pausing input, the file is autosaved without a manual save action
- After editing and then moving focus out of the editor, autosave runs if the document is dirty
- Autosave never opens a dialog and never changes the current file path
- If autosave fails, the edited text remains in memory and the document stays dirty
- Existing `Save` and `Save As` behavior continues to work

## Risks

- If autosave reads `currentDocument.content` instead of the live editor text, it may save stale content
- If autosave state is mixed into the editor controller, later editor work becomes harder to isolate
- If autosave can overlap with manual save, out-of-order save results could corrupt state semantics
- If blur handling is too broad, it may save on internal focus moves inside the editor rather than a real editor blur

## Docs Expected To Update During Implementation

- `docs/decision-log.md`
- `docs/test-report.md`
- `docs/progress.md`
- `reports/task-summaries/TASK-005.md`
