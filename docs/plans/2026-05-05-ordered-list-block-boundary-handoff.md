# Ordered List Block Boundary Editing Handoff

## Changes

- Preserved ordered-list block offsets in `parseBlockMap` when blank lines or delimiter changes split root ordered-list scopes.
- Updated ordered-list normalization so each parsed ordered-list block uses its own first marker as the start offset and only normalizes later markers inside that block.
- Changed Backspace at an ordered item content start (`2. |content`) to:
  - insert a structural blank line above the current item when there is an earlier same-scope item;
  - remove the marker separator so the current line becomes `2.|content` and intentionally stops rendering as an ordered list item;
  - keep the caret after the marker before the content.
- Updated renderer and command tests from "restart at 1 after blank line" to "preserve block offset after blank line".

## Landing Files

- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/parse-block-map.test.ts`
- `packages/editor-core/src/commands/list-edits.ts`
- `packages/editor-core/src/commands/list-edits.test.ts`
- `src/renderer/code-editor.test.ts`
- `docs/plans/2026-05-05-ordered-list-block-boundary-intake.md`

## Recommended Verification

- `npm.cmd run test -- packages/editor-core/src/commands/list-edits.test.ts src/renderer/code-editor.test.ts packages/markdown-engine/src/parse-block-map.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`

## Manual Acceptance Draft

1. Create an ordered list:
   `1. 内容`, `2. 内容2`, `3. 内容3`.
2. Put the caret at `2. |内容2` and press Backspace.
3. Confirm source becomes `1. 内容`, blank line, `2.|内容2`, `3. 内容3`.
4. Confirm the upper `1. 内容` remains rendered as an ordered list block.
5. Confirm the lower `2.|内容2` line is no longer rendered as an ordered list item.
6. Insert a blank line inside `1. one`, `2. two`, `3. three`, `4. four` and confirm the lower block keeps `3.`, `4.` rather than being rewritten to `1.`, `2.`.

## Notes

- `AGENTS.md`, `tmp/test.md`, and `tmp/*` compare/export artifacts were already dirty or untracked and were not modified by this task.
- This handoff does not mark final acceptance; it is ready for the acceptance skill after quality gates.
