Task: Editor scrollbar mode guard

Status: ad-hoc bugfix intake

Goal: Keep FishMark in editing mode when the user clicks or drags the editor scrollbar.

User report:
- In editing mode, clicking the scrollbar immediately exits to reading mode.
- Dragging the scrollbar should scroll the document without switching modes.

Scope:
- Reproduce the mode-switch regression around editor scrollbar mousedown.
- Keep the existing behavior where clicking editor/workspace blank area exits editing mode.
- Add a focused renderer regression test.

Out of scope:
- Changing the reading/editing mode model.
- Changing CodeMirror scrolling behavior or scrollbar styling.
- Changing autosave behavior.

Likely implementation area:
- `src/renderer/editor/App.tsx`
- `src/renderer/app.autosave.test.ts`

Acceptance notes:
- Existing document still opens in reading mode.
- Clicking editor content still enters editing mode.
- Pressing Escape or clicking true blank space still exits to reading mode.
- Clicking or dragging the editor scrollbar in editing mode does not exit to reading mode.
