# Cursor Hit Offset Intake

Task: New bug proposal - cursor hit offset

Goal: Fix the editor text hit-testing issue where mouse clicks must land above the intended text line to place or move the caret onto that lower line.

In scope:
- Reproduce and isolate the click-to-caret offset in the CodeMirror editor surface.
- Identify whether the owner layer is editor CSS geometry, decoration layout, or runtime DOM measurement.
- Add a focused regression test or geometry probe before changing production code.
- Apply the smallest fix that restores stable mouse hit testing without changing Markdown source semantics.

Out of scope:
- New Markdown rendering features.
- Broader theme redesign.
- Rewriting the editor architecture or replacing CodeMirror.
- Fixing unrelated existing dirty files or temporary artifacts.

Landing area:
- Likely `src/renderer/code-editor.ts`, `src/renderer/styles/editor-source.css`, `src/renderer/styles/markdown-render.css`, and focused renderer/editor tests.
- If the root cause is parser-owned line metadata, inspect `packages/markdown-engine/` only as needed.

Acceptance:
- Clicking on visible text lines places the caret on the intended line without requiring an upward offset.
- Active/inactive Markdown block rendering still preserves stable text geometry and source round-trip behavior.
- Existing IME, active block, inactive decorations, autosave, and undo/redo paths do not regress.

Verification:
- Focused regression command chosen after locating the owner layer.
- For code changes, run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- For rendering geometry changes, include a browser/Electron measurement or equivalent DOM-coordinate evidence.

Risks:
- High risk area: cursor mapping, mouse hit testing, active block switching, editor layout CSS, and CodeMirror decorations.
- Must avoid widget or CSS changes that visually fix a line while shifting CodeMirror's measured document coordinates.

Doc updates:
- Update `docs/test-cases.md` with a mouse hit-testing regression scenario if behavior changes.
- Update `docs/test-report.md` and a task summary during acceptance/closure.

Next skill: $fishmark-task-execution
