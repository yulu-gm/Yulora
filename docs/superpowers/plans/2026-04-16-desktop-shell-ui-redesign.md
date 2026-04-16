# Desktop Shell UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Yulora's renderer shell into a calmer desktop writing UI with shared design tokens and a floating settings drawer.

**Architecture:** Keep the existing React shell and CodeMirror editor, but simplify layout hierarchy, centralize reusable shell tokens, and treat settings as an overlay surface rather than a layout participant. The editor canvas remains solid and dominant while chrome becomes thinner and more consistent.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Electron renderer

---

### Task 1: Lock The New Shell Structure With Tests

**Files:**
- Modify: `src/renderer/app.autosave.test.ts`

- [ ] **Step 1: Add a failing test for the simplified desktop shell**

Add assertions that the open-document shell:
- still renders the rail and workspace
- does not render placeholder rail labels
- uses the workspace header for document identity
- keeps the status area separate from the editor canvas

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL because the old shell still renders the placeholder rail labels and old header structure.

- [ ] **Step 3: Add a failing test for the floating settings drawer**

Add assertions that the settings surface:
- still opens as a dialog
- exposes a floating drawer marker attribute
- keeps the editor mounted
- still closes with Escape

- [ ] **Step 4: Run the targeted test and verify it fails for the new expectation**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL because the current drawer markup and attributes do not match the new floating overlay model.

### Task 2: Refactor App Shell Markup

**Files:**
- Modify: `src/renderer/editor/App.tsx`

- [ ] **Step 1: Simplify the rail markup**

Remove placeholder rail labels and keep only:
- brand mark / label
- spacer
- settings trigger

- [ ] **Step 2: Move open-document identity into the lightweight header**

Update the workspace header so that:
- empty state still shows a product-level hint
- open documents show file name and path in the header
- the separate document header block is removed

- [ ] **Step 3: Mark settings as a floating overlay surface**

Add explicit attributes for the overlay and drawer surface so tests and CSS can target the floating presentation without relying on incidental class names.

- [ ] **Step 4: Run the targeted renderer test**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: PASS for the structure-related expectations once markup is updated.

### Task 3: Introduce Shared Shell Tokens And Rebuild Styles

**Files:**
- Modify: `src/renderer/styles/base.css`
- Modify: `src/renderer/styles/app-ui.css`
- Modify: `src/renderer/styles/settings.css`
- Modify: `src/renderer/styles/themes/default-light/tokens.css`
- Modify: `src/renderer/styles/themes/default-dark/tokens.css`
- Modify: `src/renderer/styles/themes/default-light/ui.css`

- [ ] **Step 1: Add reusable shell tokens**

Define shared tokens for:
- shell widths
- spacing scale
- radius scale
- border opacity
- elevation
- glass fill / border / blur
- scrim strength

- [ ] **Step 2: Quiet the global shell background**

Remove the decorative radial background and shift the page toward a calmer desktop-app surface.

- [ ] **Step 3: Rebuild the app shell styles around the token system**

Update:
- rail
- workspace header
- editor stage spacing
- empty state
- status bar

Key constraint: the editor surface must remain solid and visually dominant.

- [ ] **Step 4: Rebuild settings as a floating drawer**

Update:
- overlay scrim
- floating offset from the rail
- header / footer density
- section styling
- row layout

Key constraint: no workspace shifting when settings opens.

- [ ] **Step 5: Run the targeted renderer test again**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: PASS with the new shell and drawer styles in place.

### Task 4: Update The Product Design Doc

**Files:**
- Modify: `docs/design.md`

- [ ] **Step 1: Update the shell description**

Document the refined shell behavior:
- lighter rail
- utility header
- centered writing stage
- floating settings drawer
- calmer persistent status area

- [ ] **Step 2: Re-read the updated design section for consistency**

Check that the document describes the same shell model implemented in renderer code.

### Task 5: Full Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run renderer tests**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm run test`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: PASS
