# List Active Marker Backspace Handoff

## Scope

Fix active list Backspace behavior so a committed marker never falls back to raw source text. Once `- `, `1. `, or a task marker has become an active list marker, Backspace at the content start deletes the full marker prefix instead of producing `-content`, `1.content`, or `2.content`.

## Changed Files

- `packages/editor-core/src/commands/list-edits.ts`
- `packages/editor-core/src/commands/list-commands.ts`
- `packages/editor-core/src/commands/list-edits.test.ts`
- `packages/editor-core/src/extensions/markdown.test.ts`
- `src/renderer/markdown-editing-experience-probe.ts`
- `docs/test-report.md`

## Validation

- `npm run test -- packages/editor-core/src/commands/list-edits.test.ts packages/editor-core/src/extensions/markdown.test.ts --reporter=verbose`
- `npm run test:editing-experience`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

## Manual Acceptance

1. In an empty document, type `- `, then press Backspace. The line becomes empty and no raw `-` remains.
2. Type `- content`, move the caret to before `content`, then press Backspace. The line becomes `content`, not `-content`.
3. Repeat the same check with `1. content`, `- [ ] content`, and `- [x] content`.
4. In a nested empty list item, Backspace still removes the marker first while preserving indentation; a second Backspace clears the indentation.
