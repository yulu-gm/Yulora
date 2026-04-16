# Workspace Canvas Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the editor shell around a shared centered canvas column and move the status strip into a fixed app-level bottom bar without regressing settings, autosave, or theme behavior.

**Architecture:** Keep the current renderer state model and theme runtime intact, but restructure `src/renderer/editor/App.tsx` so `workspace` contains a lightweight top information band, a centered `workspace-canvas`, and a fixed `app-status-bar`. Update shell CSS and the default light theme tokens so alignment and glass/card material are driven by a smaller set of shared width and spacing variables instead of per-section widths.

**Tech Stack:** Electron, React 19, TypeScript, Vitest, pure CSS theme files.

---

### Task 1: Lock the desired shell structure with failing renderer tests

**Files:**
- Modify: `src/renderer/app.autosave.test.ts`

- [ ] **Step 1: Add a failing test for the centered canvas structure**

```ts
it("renders a shared workspace canvas for the header, empty state, and editor document", async () => {
  await act(async () => {
    root.render(createElement(App));
    await Promise.resolve();
    await Promise.resolve();
  });

  const workspaceHeader = container.querySelector('[data-yulora-region="workspace-header"]');
  const workspaceCanvas = container.querySelector('[data-yulora-region="workspace-canvas"]');
  const emptyState = container.querySelector('[data-yulora-region="empty-state"]');

  expect(workspaceHeader).not.toBeNull();
  expect(workspaceCanvas).not.toBeNull();
  expect(emptyState).not.toBeNull();
});
```

- [ ] **Step 2: Add a failing test for the fixed app status bar**

```ts
it("renders a fixed app status bar outside the scrolling document flow", async () => {
  await renderAndOpenDocument();

  const appStatusBar = container.querySelector('[data-yulora-region="app-status-bar"]');
  const documentHeader = container.querySelector('[data-yulora-region="document-header"]');

  expect(appStatusBar).not.toBeNull();
  expect(appStatusBar?.textContent).toContain("All changes saved");
  expect(appStatusBar?.textContent).toContain("瀛楁暟 6");
  expect(appStatusBar?.textContent).toContain("Bridge: win32");
  expect(documentHeader?.textContent).not.toContain("Bridge: win32");
});
```

- [ ] **Step 3: Run the focused renderer test file and confirm it fails for the new selectors**

Run: `npm run test -- src/renderer/app.autosave.test.ts`

Expected: FAIL with missing `workspace-header`, `workspace-canvas`, or `app-status-bar` selectors.

- [ ] **Step 4: Commit only after the later implementation turns this red-to-green cycle green**

```bash
git add src/renderer/app.autosave.test.ts
git commit -m "test: cover workspace canvas alignment shell"
```

### Task 2: Restructure `EditorApp` around a header band, centered canvas, and fixed status bar

**Files:**
- Modify: `src/renderer/editor/App.tsx`

- [ ] **Step 1: Introduce the new shell regions in JSX**

```tsx
<div className="app-workspace" data-yulora-layout="workspace">
  <header className="workspace-header" data-yulora-region="workspace-header">
    <div className="app-brand">
      <p className="app-name">Yulora</p>
      <p className="app-subtitle">Local-first Markdown writing workspace</p>
    </div>
    <p className="app-hint">{hintText}</p>
  </header>

  {state.errorMessage ? (
    <p className="error-banner" role="alert">
      {state.errorMessage}
    </p>
  ) : null}

  <section className="workspace-canvas" data-yulora-region="workspace-canvas">
    {state.currentDocument ? (
      <section className="workspace-shell">
        <div className="document-bar" data-yulora-region="document-header">
          ...
        </div>
        <div className="document-canvas" ref={editorContainerRef}>
          ...
        </div>
      </section>
    ) : (
      <section className="empty-workspace" data-yulora-region="empty-state">
        ...
      </section>
    )}
  </section>

  <footer className="app-status-bar" data-yulora-region="app-status-bar">
    ...
  </footer>
</div>
```

- [ ] **Step 2: Move save status, word count, and platform info into the app-level footer**

```tsx
<footer className="app-status-bar" data-yulora-region="app-status-bar">
  <p className={`save-status ${state.isDirty ? "is-dirty" : "is-clean"}`}>
    {saveStatusLabel}
  </p>
  <p className="document-word-count">瀛楁暟 {currentDocumentMetrics?.meaningfulCharacterCount ?? 0}</p>
  <p className="document-platform">Bridge: {yulora.platform}</p>
</footer>
```

- [ ] **Step 3: Remove the old in-flow status strip from the document section**

```tsx
// Delete this block entirely:
<div className="document-status-strip" data-yulora-region="status-strip">
  ...
</div>
```

- [ ] **Step 4: Keep existing autosave, focus restore, and theme code unchanged unless the JSX move requires renaming local variables**

Run: `npm run test -- src/renderer/app.autosave.test.ts`

Expected: PASS for the new structure tests; any unrelated failures should be fixed before proceeding.

- [ ] **Step 5: Commit the JSX restructuring**

```bash
git add src/renderer/editor/App.tsx src/renderer/app.autosave.test.ts
git commit -m "feat: restructure workspace around centered canvas"
```

### Task 3: Refactor shell CSS to use a single canvas width system and fixed bottom bar

**Files:**
- Modify: `src/renderer/styles/base.css`
- Modify: `src/renderer/styles/app-ui.css`

- [ ] **Step 1: Add shared shell size variables in `base.css`**

```css
:root {
  --yulora-shell-rail-width: 88px;
  --yulora-workspace-max-width: 1180px;
  --yulora-canvas-max-width: 1040px;
  --yulora-editor-max-width: 960px;
  --yulora-status-bar-height: 56px;
}
```

- [ ] **Step 2: Make the workspace reserve space for the fixed bottom bar**

```css
.app-workspace {
  min-width: 0;
  padding:
    22px clamp(18px, 3vw, 42px)
    calc(var(--yulora-status-bar-height) + 28px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  align-content: start;
}
```

- [ ] **Step 3: Replace per-section width drift with a shared canvas column**

```css
.workspace-header,
.error-banner {
  width: min(100%, var(--yulora-workspace-max-width));
  margin-inline: auto;
}

.workspace-canvas {
  width: min(100%, var(--yulora-canvas-max-width));
  margin-inline: auto;
}

.document-bar,
.document-canvas,
.empty-workspace {
  width: 100%;
}

.document-editor,
.empty-inner {
  width: min(100%, var(--yulora-editor-max-width));
}
```

- [ ] **Step 4: Define the fixed app status bar**

```css
.app-status-bar {
  position: fixed;
  inset-inline: calc(clamp(18px, 3vw, 42px));
  inset-block-end: 14px;
  margin-inline-start: calc(var(--yulora-shell-rail-width) + 14px);
  min-height: var(--yulora-status-bar-height);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  border: 1px solid var(--yulora-border-subtle);
  border-radius: 18px;
  z-index: 12;
}
```

- [ ] **Step 5: Update responsive rules so the fixed bar still works on narrow windows**

```css
@media (max-width: 720px) {
  .app-status-bar {
    inset-inline: 12px;
    margin-inline-start: calc(62px + 10px);
    flex-wrap: wrap;
    min-height: auto;
    padding-block: 10px;
  }
}
```

- [ ] **Step 6: Run the focused renderer test file again**

Run: `npm run test -- src/renderer/app.autosave.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the shell CSS changes**

```bash
git add src/renderer/styles/base.css src/renderer/styles/app-ui.css
git commit -m "feat: align workspace canvas and fixed status bar"
```

### Task 4: Refine the settings drawer and default light theme tokens to match the approved visual direction

**Files:**
- Modify: `src/renderer/styles/settings.css`
- Modify: `src/renderer/styles/themes/default-light/tokens.css`
- Modify: `src/renderer/styles/themes/default-light/ui.css`

- [ ] **Step 1: Update default light tokens toward the quieter writing-tool palette**

```css
:root {
  --yulora-page-bg: #f3f5f7;
  --yulora-surface-bg: #ffffff;
  --yulora-surface-raised-bg: #ffffff;
  --yulora-surface-muted-bg: #f8fafc;
  --yulora-surface-subtle-bg: #eef2f6;
  --yulora-border-strong: #d7dee8;
  --yulora-border-subtle: #e4e9f0;
  --yulora-text-strong: #142033;
  --yulora-text-body: #243246;
  --yulora-text-muted: #5f7086;
  --yulora-text-subtle: #8a99ad;
}
```

- [ ] **Step 2: Soften the page chrome and emphasis colors in `default-light/ui.css`**

```css
:root {
  --yulora-dirty-text: #9a6700;
  --yulora-clean-text: #285b84;
  --yulora-focus-ring: #6b9df0;
  --yulora-danger-bg: #fff4f4;
}
```

- [ ] **Step 3: Make the drawer feel like translucent white glass instead of a solid side page**

```css
.settings-shell {
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--yulora-surface-raised-bg) 82%, transparent) 0%,
      color-mix(in srgb, #ffffff 92%, transparent) 100%
    ),
    rgba(255, 255, 255, 0.78);
  box-shadow: 0 24px 64px rgba(17, 24, 39, 0.18);
  backdrop-filter: blur(26px) saturate(1.06);
}
```

- [ ] **Step 4: Keep form surfaces pure white with light separation**

```css
.settings-group {
  background: color-mix(in srgb, #ffffff 92%, transparent);
  border: 1px solid var(--yulora-border-subtle);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}
```

- [ ] **Step 5: Run the focused renderer tests after the visual CSS update**

Run: `npm run test -- src/renderer/app.autosave.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the visual refinements**

```bash
git add src/renderer/styles/settings.css src/renderer/styles/themes/default-light/tokens.css src/renderer/styles/themes/default-light/ui.css
git commit -m "style: refine default light writing theme"
```

### Task 5: Verify the full gate and record any follow-up docs if needed

**Files:**
- Modify: `docs/design.md`
- Modify: `docs/test-cases.md`

- [ ] **Step 1: Update `docs/design.md` if the fixed bottom app status bar meaningfully changes the shell baseline**

```md
- 中间是顶部信息带 + 独立居中画布的工作区
- 应用底部提供固定状态条，持续展示保存状态、字数与平台信息
```

- [ ] **Step 2: Update `docs/test-cases.md` with the new manual checks**

```md
1. 空态下确认顶部信息带与主卡片共存但不歪斜
2. 打开长文档后确认状态条固定在应用底部
3. 滚到文档末尾时确认最后几行文本不被状态条遮挡
```

- [ ] **Step 3: Run the full verification gate**

Run:
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- All commands pass with no new failures.

- [ ] **Step 4: Commit the verification-ready final state**

```bash
git add docs/design.md docs/test-cases.md
git commit -m "docs: sync workspace canvas alignment behavior"
```
