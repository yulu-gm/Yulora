# Ordered List Block Boundary Editing Intake

## Task

Ad-hoc ordered-list block boundary editing update.

## Goal

Align ordered-list editing with the paragraph/block formatting model: blank source lines separate blocks, ordered markers are sequential only inside a single block, and Backspace at an ordered item content start can intentionally break list rendering for the current line while preserving the completed list block above it.

## In Scope

- Preserve each ordered-list block's first marker as its allowed offset.
- Normalize later ordered markers only within the same parsed block/scope.
- Keep Enter inside an ordered item creating a same-block sibling with sequential numbering.
- Change Backspace at `2. |content` to insert a structural blank line above the current item and remove the marker separator, yielding `2.|content`.
- Add command-level and renderer-level tests for the new Backspace behavior.

## Out of Scope

- Parser dialect changes beyond using the existing block map.
- Rewriting saved documents outside explicit list-edit transactions.
- Nested ordered-list escape semantics beyond the current top-level behavior unless already covered by the existing command context.
- Visual redesign of list rendering.

## Landing Area

- `packages/editor-core/src/commands/list-edits.ts`
- `packages/editor-core/src/commands/list-edits.test.ts`
- `src/renderer/code-editor.test.ts`
- `docs/plans/2026-05-05-ordered-list-block-boundary-handoff.md`

## Acceptance

- `1. a / 2. |b / 3. c` Backspace becomes `1. a / blank / 2.|b / 3. c`.
- The caret remains after `2.` before the content.
- Blank-line-separated ordered blocks keep their first marker offset while normalizing following markers.
- Existing ordered-list Enter behavior remains sequential inside the same block.

## Verification

- `npm.cmd run test -- packages/editor-core/src/commands/list-edits.test.ts src/renderer/code-editor.test.ts packages/markdown-engine/src/parse-block-map.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`

## Risks

- High: ordered-list normalization can rewrite more source than intended.
- Medium: Backspace transaction selection mapping must remain stable.
- Medium: inactive blank-line rendering is being refactored in the current worktree and must be treated as baseline, not reverted.

## Next Skill

`$fishmark-task-execution`
