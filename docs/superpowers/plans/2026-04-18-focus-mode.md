# Focus Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual and automatic shell-level focus mode that collapses rail/header/status bar, preserves editor behavior, keeps outline independent, and lets settings force non-focus mode.

**Architecture:** Implement focus mode in the renderer shell as a small runtime state machine plus persisted focus preferences. Keep automatic input detection in `src/renderer/editor/App.tsx`, use shared preferences for persisted auto settings, and extend existing renderer tests before production changes.

**Tech Stack:** React 19, TypeScript, Electron renderer shell, shared preferences, Vitest

---

## File Map

- Modify: `src/shared/preferences.ts`
- Modify: `src/shared/preferences.test.ts`
- Modify: `src/renderer/editor/settings-view.tsx`
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/styles/app-ui.css`
- Modify: `src/renderer/styles/settings.css`
- Modify: `src/renderer/app.autosave.test.ts`
- Modify: `docs/design.md`

### Task 1: Add Focus Preferences Contract

**Files:**
- Modify: `src/shared/preferences.ts`
- Test: `src/shared/preferences.test.ts`

- [ ] **Step 1: Write failing preference tests**

Add tests covering:

- `normalizePreferences({ focus: { autoSwitch: false, idleDelayMs: 3000 } })`
- clamping `focus.idleDelayMs` to `500` and `30000`
- preserving unrelated fields during `mergePreferences`

- [ ] **Step 2: Run tests to verify RED**

Run: `npm run test -- src/shared/preferences.test.ts`
Expected: FAIL because `focus` is not part of the schema yet.

- [ ] **Step 3: Add the shared contract**

Implement:

- `FocusPreferences`
- `focus` on `Preferences`
- `focus` on `PreferencesUpdate`
- `DEFAULT_PREFERENCES.focus`
- normalization + merge support

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm run test -- src/shared/preferences.test.ts`
Expected: PASS

- [ ] **Step 5: Refactor if needed**

Keep normalization helpers small and colocated with the existing autosave helpers.

### Task 2: Add Focus Settings Controls

**Files:**
- Modify: `src/renderer/editor/settings-view.tsx`
- Modify: `src/renderer/styles/settings.css`
- Test: `src/renderer/app.autosave.test.ts`

- [ ] **Step 1: Write failing renderer tests for settings**

Add tests covering:

- focus settings group renders
- auto-switch checkbox persists `focus.autoSwitch`
- idle delay control supports preset selection
- invalid manual idle entry resets to the persisted value

- [ ] **Step 2: Run tests to verify RED**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL because the focus settings controls do not exist.

- [ ] **Step 3: Implement settings controls**

Add:

- a `Focus` section
- a runtime/manual focus control callback prop
- persisted `autoSwitch` checkbox
- combobox + numeric input flow for idle delay in seconds

- [ ] **Step 4: Update settings styling**

Support a compact control stack for the combined preset/manual idle control and reuse existing input styling where possible.

- [ ] **Step 5: Run tests to verify GREEN**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: new settings tests PASS

### Task 3: Add Renderer Focus Runtime

**Files:**
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/styles/app-ui.css`
- Test: `src/renderer/app.autosave.test.ts`

- [ ] **Step 1: Write failing renderer tests for focus behavior**

Add tests covering:

- rail focus toggle enters/exits manual focus
- keyboard activity enters auto focus when enabled
- idle timeout enters auto focus after configured delay
- pointer move and wheel exit auto focus
- pointer input does not exit manual focus
- opening settings forces non-focus
- outline stays open across focus transitions

- [ ] **Step 2: Run tests to verify RED**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL because focus runtime does not exist.

- [ ] **Step 3: Implement shell focus state**

Add:

- focus runtime state + source
- shell chrome snapshot/restore for rail/header/status bar
- settings override
- event listeners for keyboard/pointer/wheel activity
- timer logic driven by `preferences.focus.idleDelayMs`

- [ ] **Step 4: Implement shell chrome attributes/classes**

Apply stable state markers to the shell so CSS can collapse chrome without remounting the editor.

- [ ] **Step 5: Update shell styling**

Animate rail/header/status bar collapse while keeping the editor canvas mounted and outline independent.

- [ ] **Step 6: Run tests to verify GREEN**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: focus runtime tests PASS

### Task 4: Update Docs

**Files:**
- Modify: `docs/design.md`

- [ ] **Step 1: Update shell baseline documentation**

Document:

- focus mode scope
- settings override behavior
- outline independence

- [ ] **Step 2: Verify doc consistency**

Check the updated design text still matches the implemented shell model.

### Task 5: Final Verification

**Files:**
- Modify only as needed based on verification

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm run test -- src/shared/preferences.test.ts src/renderer/app.autosave.test.ts
```

Expected: PASS

- [ ] **Step 2: Run repository gates**

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: PASS

- [ ] **Step 3: Manual smoke expectations**

Verify in the app:

- rail button toggles focus mode
- settings opening exits focus
- outline state survives focus transitions
- auto-focus enters after 3 seconds by default
- mouse movement exits auto focus

