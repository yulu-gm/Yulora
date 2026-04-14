# AGENTS.md

## Project mission
Build a local-first Markdown desktop editor for macOS and Windows with a Typora-like single-pane editing experience.

## Product principles
- Markdown text is the single source of truth.
- WYSIWYM over full WYSIWYG.
- Local-first by default.
- UX stability beats feature count.
- Cross-platform consistency matters.

## Fixed stack for MVP
- Electron
- React
- TypeScript
- CodeMirror 6
- micromark
- Vite
- Vitest
- Playwright

Do not replace the core stack without explicit approval.

## Architecture rules
- Keep main, preload, renderer strictly separated.
- Do not expose unrestricted Node APIs to the renderer.
- Treat block rendering as a view concern, not the source of truth.
- Preserve Markdown round-trip safety.
- Avoid automatic whole-document reformatting on save.

## Task rules
- Work on one task at a time.
- Keep diffs focused and reversible.
- Do not touch unrelated files.
- Prefer small modules and explicit interfaces.
- Add or update tests for behavior changes.
- Update docs when changing architecture or user-visible behavior.

## Definition of done
A task is only done when:
- build passes
- lint passes
- typecheck passes
- relevant tests pass
- acceptance criteria are satisfied
- a short task summary is written

## P0 UX priorities
- IME stability
- cursor mapping
- undo/redo semantics
- autosave safety
- Markdown text fidelity

## P1 UX priorities
- image paste/drop
- outline
- search/replace
- export

## P2 later priorities
- themes
- frontmatter UI
- math
- mermaid
- local history

## Never do these without approval
- replace CodeMirror with ProseMirror/Milkdown
- migrate Electron MVP to Tauri
- introduce cloud sync
- introduce collaboration
- large dependency additions
- broad refactors across unrelated modules
