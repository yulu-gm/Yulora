# Theme Package Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse Yulora's theme system to a single manifest-driven theme package contract with one builtin `default` theme package and no legacy family compatibility code.

**Architecture:** Replace the current dual-path discovery model with a single theme-package pipeline from `main` through `preload` to `renderer`. Convert builtin `default` into a real package under renderer-owned theme assets, remove legacy css-family discovery and legacy id adapters, and keep `rain-glass` only as an external fixture package loaded from `<userData>/themes`.

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest, CSS

---

## File Map

### Runtime and data model

- Modify: `src/main/theme-package-service.ts`
  - Remove legacy css-family discovery.
  - Add builtin `default` package discovery.
- Delete: `src/main/theme-service.ts`
  - Remove the legacy theme-family service.
- Delete: `src/main/theme-service.test.ts`
  - Remove tests for the deleted service.
- Modify: `src/shared/theme-package.ts`
  - Reuse the existing manifest schema without adding mode-specific style fields.

### Preload and renderer typing

- Modify: `src/preload/preload.ts`
  - Remove `listThemes` / `refreshThemes` channels and types.
- Modify: `src/preload/preload.test.ts`
  - Remove old bridge assertions.
- Modify: `src/preload/preload.contract.test.ts`
  - Lock package-only preload contract.
- Modify: `src/renderer/types.d.ts`
  - Remove `ThemeDescriptor` and package `kind` legacy union values.

### Renderer theme resolution

- Modify: `src/renderer/theme-package-catalog.ts`
  - Remove legacy id migration helpers and builtin hardcoded fallback descriptor creation.
- Modify: `src/renderer/theme-package-runtime.ts`
  - Keep as the single stylesheet runtime.
- Delete or reduce: `src/renderer/theme-runtime.ts`
  - Remove builtin descriptor and old theme-runtime responsibilities.
- Delete: `src/renderer/theme-catalog.ts`
  - Remove legacy theme-family catalog helpers.
- Modify: `src/renderer/editor/App.tsx`
  - Remove all `listThemes()` usage and package fallback bridges.
- Modify: `src/renderer/editor/settings-view.tsx`
  - Keep theme settings package-only.

### Builtin and external theme assets

- Create: `src/renderer/theme-packages/default/manifest.json`
- Create: `src/renderer/theme-packages/default/tokens/light.css`
- Create: `src/renderer/theme-packages/default/tokens/dark.css`
- Create: `src/renderer/theme-packages/default/styles/ui.css`
- Create: `src/renderer/theme-packages/default/styles/editor.css`
- Create: `src/renderer/theme-packages/default/styles/markdown.css`
- Optionally create: `src/renderer/theme-packages/default/styles/titlebar.css`
- Optionally create: `src/renderer/theme-packages/default/layout/titlebar.json`
- Delete after migration: `src/renderer/styles/themes/default/light/*`
- Delete after migration: `src/renderer/styles/themes/default/dark/*`
- Keep/modify: `fixtures/themes/rain-glass/**`
  - Remain as external fixture package only.
- Modify: `scripts/sync-dev-themes.mjs`
  - Sync only external fixture packages into dev user data.

### Tests and docs

- Modify: `src/main/theme-package-service.test.ts`
- Modify: `src/renderer/theme-package-runtime.test.ts`
- Modify or delete: `src/renderer/theme-runtime.test.ts`
- Modify: `src/renderer/app.autosave.test.ts`
- Modify: `docs/theme-packages.md`
- Modify: `docs/test-cases.md`

---

### Task 1: Lock the package-only contract with failing tests

**Files:**
- Modify: `src/main/theme-package-service.test.ts`
- Modify: `src/preload/preload.test.ts`
- Modify: `src/preload/preload.contract.test.ts`
- Modify: `src/renderer/app.autosave.test.ts`

- [ ] **Step 1: Add a failing main-process test that rejects legacy css-family directories**

Add this test to `src/main/theme-package-service.test.ts`:

```ts
it("ignores legacy css-only theme directories without a manifest", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yulora-theme-packages-no-legacy-"));
  const userDataDir = path.join(root, "userdata");

  await mkdir(path.join(userDataDir, "themes", "graphite", "dark"), { recursive: true });
  await writeFile(path.join(userDataDir, "themes", "graphite", "dark", "ui.css"), "/* legacy */");

  const service = createThemePackageService({ userDataDir });
  const packages = await service.listThemePackages();

  expect(packages.some((entry) => entry.id === "graphite")).toBe(false);

  await rm(root, { recursive: true, force: true });
});
```

- [ ] **Step 2: Add a failing main-process test that expects builtin `default` to be returned**

Add this test to `src/main/theme-package-service.test.ts`:

```ts
it("always includes the builtin default theme package", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yulora-theme-packages-builtin-"));
  const userDataDir = path.join(root, "userdata");
  const service = createThemePackageService({ userDataDir });

  const packages = await service.listThemePackages();

  expect(packages.find((entry) => entry.id === "default")).toMatchObject({
    id: "default",
    source: "builtin",
    kind: "manifest-package"
  });

  await rm(root, { recursive: true, force: true });
});
```

- [ ] **Step 3: Add failing preload contract assertions that old theme channels no longer exist**

In `src/preload/preload.contract.test.ts`, replace the old theme-channel expectation with:

```ts
expect(invoke.mock.calls).not.toContainEqual(["yulora:list-themes"]);
expect(invoke.mock.calls).not.toContainEqual(["yulora:refresh-themes"]);
expect(invoke.mock.calls).toContainEqual(["yulora:list-theme-packages"]);
expect(invoke.mock.calls).toContainEqual(["yulora:refresh-theme-packages"]);
```

In `src/preload/preload.test.ts`, remove the old theme bridge test and add:

```ts
it("does not expose legacy theme-family bridge methods", () => {
  expect("listThemes" in window.yulora).toBe(false);
  expect("refreshThemes" in window.yulora).toBe(false);
});
```

- [ ] **Step 4: Add a failing renderer test that package-only loading still falls back to builtin `default`**

In `src/renderer/app.autosave.test.ts`, add a test shaped like:

```ts
it("falls back to builtin default when the selected package is missing and no theme-family catalog exists", async () => {
  await renderEditorApp({
    getPreferencesResult: {
      ...DEFAULT_PREFERENCES,
      theme: {
        ...DEFAULT_PREFERENCES.theme,
        mode: "dark",
        selectedId: "missing-package",
        effectsMode: "auto",
        parameters: {}
      }
    },
    listThemePackagesResult: []
  });

  const tokensLink = document.head.querySelector('link[data-yulora-theme-part="tokens"]');
  expect(tokensLink?.getAttribute("href")).toContain("/theme-packages/default/tokens/dark.css");
});
```

- [ ] **Step 5: Run the focused tests and confirm they fail for the new package-only expectations**

Run:

```bash
npm.cmd test -- src/main/theme-package-service.test.ts src/preload/preload.test.ts src/preload/preload.contract.test.ts src/renderer/app.autosave.test.ts
```

Expected:

- `src/main/theme-package-service.test.ts` fails because legacy css-family directories are still accepted and builtin `default` is not yet injected
- preload tests fail because `listThemes` and `refreshThemes` still exist
- app test fails because renderer still relies on old fallback plumbing

- [ ] **Step 6: Commit the red test baseline**

```bash
git add src/main/theme-package-service.test.ts src/preload/preload.test.ts src/preload/preload.contract.test.ts src/renderer/app.autosave.test.ts
git commit -m "test: lock package-only theme contract"
```

### Task 2: Remove legacy discovery from `main` and `preload`

**Files:**
- Modify: `src/main/theme-package-service.ts`
- Delete: `src/main/theme-service.ts`
- Delete: `src/main/theme-service.test.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.d.ts`

- [ ] **Step 1: Implement builtin package discovery and delete legacy css-family code paths**

In `src/main/theme-package-service.ts`:

- delete:

```ts
type ThemePackageKind = "manifest-package" | "legacy-css-family";
type LegacyThemeMode = "light" | "dark";
type LegacyThemeModeAssets = { ... };
function createLegacyManifest(...) { ... }
async function resolveLegacyModeAssets(...) { ... }
async function createLegacyCssFamilyDescriptor(...) { ... }
```

- replace `scanThemePackages(...)` with package-only discovery that merges builtin and community packages:

```ts
const BUILTIN_THEME_PACKAGES_DIR = path.resolve(process.cwd(), "src/renderer/theme-packages");

async function readThemePackageDescriptor(
  packageRoot: string,
  source: "builtin" | "community",
  dependencies: ThemePackageServiceDependencies
): Promise<ThemePackageDescriptor | null> {
  const manifestState = await readManifestState(path.join(packageRoot, "manifest.json"), packageRoot, dependencies);

  if (manifestState.kind !== "valid") {
    return null;
  }

  return {
    id: manifestState.manifest.id,
    kind: "manifest-package",
    source,
    packageRoot,
    manifest: manifestState.manifest
  };
}

async function scanThemePackages(
  userDataDir: string,
  dependencies: ThemePackageServiceDependencies
): Promise<ThemePackageDescriptor[]> {
  const builtinEntries = await safeReadDir(BUILTIN_THEME_PACKAGES_DIR, dependencies);
  const communityEntries = await safeReadDir(path.join(userDataDir, "themes"), dependencies);

  const builtinPackages = await Promise.all(
    builtinEntries.filter((entry) => entry.isDirectory()).map((entry) =>
      readThemePackageDescriptor(path.join(BUILTIN_THEME_PACKAGES_DIR, entry.name), "builtin", dependencies)
    )
  );

  const communityPackages = await Promise.all(
    communityEntries.filter((entry) => entry.isDirectory()).map((entry) =>
      readThemePackageDescriptor(path.join(userDataDir, "themes", entry.name), "community", dependencies)
    )
  );

  return [...builtinPackages, ...communityPackages]
    .filter((entry): entry is ThemePackageDescriptor => entry !== null)
    .sort((left, right) => left.id.localeCompare(right.id));
}
```

- [ ] **Step 2: Remove the legacy theme service files**

Run:

```bash
git rm src/main/theme-service.ts src/main/theme-service.test.ts
```

Expected:

- both files are staged for deletion

- [ ] **Step 3: Remove old preload channels and bridge methods**

In `src/preload/preload.ts`, delete:

```ts
const LIST_THEMES_CHANNEL = "yulora:list-themes";
const REFRESH_THEMES_CHANNEL = "yulora:refresh-themes";
type ThemeDescriptor = { ... };
listThemes: (): Promise<ThemeDescriptor[]> => ipcRenderer.invoke(LIST_THEMES_CHANNEL),
refreshThemes: (): Promise<ThemeDescriptor[]> => ipcRenderer.invoke(REFRESH_THEMES_CHANNEL),
```

Also tighten the package descriptor type:

```ts
type ThemePackageDescriptor = {
  id: string;
  kind: "manifest-package";
  source: "builtin" | "community";
  packageRoot: string;
  manifest: {
    id: string;
    name: string;
    version: string;
    author: string | null;
    supports: { light: boolean; dark: boolean };
    tokens: Partial<Record<"light" | "dark", string>>;
    styles: Partial<Record<"ui" | "editor" | "markdown" | "titlebar", string>>;
    layout: { titlebar: string | null };
    scene: { id: string; sharedUniforms: Record<string, number> } | null;
    surfaces: Partial<
      Record<
        "workbenchBackground" | "titlebarBackdrop" | "welcomeHero",
        { kind: "fragment"; scene: string; shader: string }
      >
    >;
    parameters: ThemeParameterDescriptor[];
  };
};
```

- [ ] **Step 4: Remove old renderer window typings**

In `src/renderer/types.d.ts`, delete:

```ts
type ThemeDescriptor = { ... };
listThemes: () => Promise<ThemeDescriptor[]>;
refreshThemes: () => Promise<ThemeDescriptor[]>;
```

and tighten package type to:

```ts
type ThemePackageDescriptor = {
  id: string;
  kind: "manifest-package";
  source: "builtin" | "community";
  packageRoot: string;
  manifest: ThemePackageManifest;
};
```

- [ ] **Step 5: Re-run the focused tests and make sure `main` + `preload` are green while renderer remains the next red frontier**

Run:

```bash
npm.cmd test -- src/main/theme-package-service.test.ts src/preload/preload.test.ts src/preload/preload.contract.test.ts
```

Expected:

- all three files pass

- [ ] **Step 6: Commit the `main` + `preload` cleanup**

```bash
git add src/main/theme-package-service.ts src/preload/preload.ts src/renderer/types.d.ts src/main/theme-package-service.test.ts src/preload/preload.test.ts src/preload/preload.contract.test.ts
git add -u src/main/theme-service.ts src/main/theme-service.test.ts
git commit -m "refactor: remove legacy theme discovery"
```

### Task 3: Convert builtin `default` into a real theme package

**Files:**
- Create: `src/renderer/theme-packages/default/manifest.json`
- Create: `src/renderer/theme-packages/default/tokens/light.css`
- Create: `src/renderer/theme-packages/default/tokens/dark.css`
- Create: `src/renderer/theme-packages/default/styles/ui.css`
- Create: `src/renderer/theme-packages/default/styles/editor.css`
- Create: `src/renderer/theme-packages/default/styles/markdown.css`
- Delete after migration: `src/renderer/styles/themes/default/light/*`
- Delete after migration: `src/renderer/styles/themes/default/dark/*`

- [ ] **Step 1: Add the builtin `default` manifest**

Create `src/renderer/theme-packages/default/manifest.json` with:

```json
{
  "id": "default",
  "name": "Yulora Default",
  "version": "1.0.0",
  "author": "Yulora",
  "supports": {
    "light": true,
    "dark": true
  },
  "tokens": {
    "light": "./tokens/light.css",
    "dark": "./tokens/dark.css"
  },
  "styles": {
    "ui": "./styles/ui.css",
    "editor": "./styles/editor.css",
    "markdown": "./styles/markdown.css"
  },
  "layout": {
    "titlebar": null
  },
  "scene": null,
  "surfaces": {},
  "parameters": []
}
```

- [ ] **Step 2: Copy token files into the new package unchanged**

Run:

```bash
New-Item -ItemType Directory -Force 'src/renderer/theme-packages/default/tokens'
Copy-Item 'src/renderer/styles/themes/default/light/tokens.css' 'src/renderer/theme-packages/default/tokens/light.css'
Copy-Item 'src/renderer/styles/themes/default/dark/tokens.css' 'src/renderer/theme-packages/default/tokens/dark.css'
```

Expected:

- token files exist under `src/renderer/theme-packages/default/tokens/`

- [ ] **Step 3: Merge the old light/dark UI styles into a single package style file**

Create `src/renderer/theme-packages/default/styles/ui.css` by combining the existing light and dark rules:

```css
:root {
  --yulora-dirty-text: #9a6700;
  --yulora-clean-text: #285b84;
  --yulora-danger-bg: #fff4f4;
  --yulora-danger-border: #efc2c2;
  --yulora-danger-text: #8b1e1e;
  --yulora-focus-ring: #6b9df0;
  --yu-ctrl-solid-bg: var(--yulora-surface-bg);
  --yu-ctrl-solid-bg-hover: var(--yulora-surface-raised-bg);
  --yu-ctrl-solid-border: var(--yulora-border-subtle);
  --yu-ctrl-solid-border-hover: var(--yulora-border-muted);
  --yu-ctrl-glass-bg: color-mix(in srgb, var(--yulora-glass-strong-bg) 46%, transparent);
  --yu-ctrl-glass-bg-hover: color-mix(in srgb, var(--yulora-glass-strong-bg) 74%, transparent);
  --yu-ctrl-glass-border: var(--yulora-border-subtle);
  --yu-ctrl-glass-border-hover: var(--yulora-border-muted);
  --yu-ctrl-text: var(--yulora-text-secondary);
  --yu-ctrl-text-hover: var(--yulora-text-strong);
  --yu-input-bg: color-mix(in srgb, var(--yulora-glass-strong-bg) 42%, transparent);
  --yu-input-bg-focus: color-mix(in srgb, var(--yulora-glass-strong-bg) 68%, transparent);
  --yu-input-border: var(--yulora-border-muted);
  --yu-input-border-focus: var(--yulora-focus-ring);
  --yu-input-ring: color-mix(in srgb, var(--yulora-focus-ring) 16%, transparent);
  --yu-segment-bg: color-mix(in srgb, var(--yulora-glass-strong-bg) 38%, transparent);
  --yu-segment-border: var(--yulora-border-muted);
  --yu-segment-active-bg: color-mix(in srgb, var(--yulora-glass-strong-bg) 68%, transparent);
}

:root[data-yulora-theme="dark"] {
  --yulora-dirty-text: #fbbf24;
  --yulora-clean-text: #86efac;
  --yulora-danger-bg: #3b1217;
  --yulora-danger-border: #7f1d1d;
  --yulora-danger-text: #fecaca;
  --yulora-focus-ring: #60a5fa;
  --yu-ctrl-solid-bg: var(--yulora-surface-raised-bg);
  --yu-ctrl-solid-bg-hover: var(--yulora-surface-muted-bg);
  --yu-ctrl-solid-border: var(--yulora-border-subtle);
  --yu-ctrl-solid-border-hover: var(--yulora-border-muted);
}
```

- [ ] **Step 4: Merge editor and markdown files the same way**

Create `src/renderer/theme-packages/default/styles/editor.css`:

```css
:root {
  --yulora-editor-font-family: "Aptos", "Charter", "Georgia", serif;
  --yulora-editor-font-size: 1.05rem;
  --yulora-editor-caret: #1d4ed8;
}

:root[data-yulora-theme="dark"] {
  --yulora-editor-caret: #60a5fa;
}
```

Create `src/renderer/theme-packages/default/styles/markdown.css`:

```css
:root {
  --yulora-inline-code-bg: rgba(17, 24, 39, 0.06);
  --yulora-inline-code-text: #0f172a;
  --yulora-list-marker: #98a2b3;
  --yulora-task-border: #b6bec9;
  --yulora-task-bg: #ffffff;
  --yulora-task-check: #4b5565;
  --yulora-thematic-break: #d0d5dd;
  --yulora-code-block-bg: #f3f6fa;
  --yulora-code-block-text: #334155;
}

:root[data-yulora-theme="dark"] {
  --yulora-inline-code-bg: rgba(148, 163, 184, 0.16);
  --yulora-inline-code-text: #f8fafc;
  --yulora-list-marker: #94a3b8;
  --yulora-task-border: #64748b;
  --yulora-task-bg: #0f172a;
  --yulora-task-check: #e2e8f0;
  --yulora-thematic-break: #334155;
  --yulora-code-block-bg: #17212b;
  --yulora-code-block-text: #dbe4f0;
}
```

- [ ] **Step 5: Delete the old builtin default theme asset directories**

Run:

```bash
git rm -r src/renderer/styles/themes/default
```

Expected:

- old light/dark directories are staged for deletion

- [ ] **Step 6: Add a focused service test for the builtin manifest path**

In `src/main/theme-package-service.test.ts`, add:

```ts
it("loads builtin default from the renderer theme-packages directory", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yulora-theme-packages-default-path-"));
  const userDataDir = path.join(root, "userdata");
  const service = createThemePackageService({ userDataDir });

  const packages = await service.listThemePackages();
  const builtinDefault = packages.find((entry) => entry.id === "default");

  expect(builtinDefault?.packageRoot.replace(/\\/g, "/")).toContain("/src/renderer/theme-packages/default");
  expect(builtinDefault?.manifest.tokens.dark?.replace(/\\/g, "/")).toContain("/src/renderer/theme-packages/default/tokens/dark.css");

  await rm(root, { recursive: true, force: true });
});
```

- [ ] **Step 7: Run the service tests again**

Run:

```bash
npm.cmd test -- src/main/theme-package-service.test.ts
```

Expected:

- PASS

- [ ] **Step 8: Commit the builtin default package migration**

```bash
git add src/renderer/theme-packages/default src/main/theme-package-service.test.ts
git add -u src/renderer/styles/themes/default
git commit -m "refactor: convert default to builtin theme package"
```

### Task 4: Collapse renderer to package-only resolution

**Files:**
- Modify: `src/renderer/theme-package-catalog.ts`
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/app.autosave.test.ts`
- Delete: `src/renderer/theme-catalog.ts`
- Delete or refactor: `src/renderer/theme-runtime.ts`
- Modify or delete: `src/renderer/theme-runtime.test.ts`

- [ ] **Step 1: Add a failing renderer-catalog test for builtin package fallback without hardcoded descriptor generation**

If keeping `src/renderer/theme-runtime.test.ts`, replace its builtin assertions with package-path assertions:

```ts
it("does not rely on hardcoded builtin default css paths", () => {
  const runtimeSource = readFileSync(join(process.cwd(), "src/renderer/theme-package-catalog.ts"), "utf8");

  expect(runtimeSource).not.toContain("createBuiltinThemePackageDescriptor");
  expect(runtimeSource).not.toContain("resolveBuiltinThemeDescriptor");
});
```

- [ ] **Step 2: Remove legacy adapter code from `theme-package-catalog.ts`**

In `src/renderer/theme-package-catalog.ts`, delete:

```ts
import { createBuiltinThemePackageDescriptor } from "./theme-runtime";
const LEGACY_THEME_PACKAGE_SUFFIX = /(?:-|_)(light|dark)$/u;
export function resolveLegacyThemeFamilyId(...) { ... }
```

Replace fallback resolution with a package-catalog-only implementation:

```ts
function createFallbackDescriptor(
  packages: ThemePackageRuntimeEntry[],
  mode: "light" | "dark"
): ThemePackageRuntimeDescriptor {
  const builtinDefault = packages.find((entry) => entry.id === "default" && entry.source === "builtin");

  if (!builtinDefault) {
    throw new Error("Builtin default theme package is missing.");
  }

  return {
    id: builtinDefault.id,
    tokens: builtinDefault.tokens,
    styles: builtinDefault.styles
  };
}

export function resolveActiveThemePackage(
  selectedId: string | null,
  packages: ThemePackageRuntimeEntry[],
  mode: "light" | "dark"
): ActiveThemePackageResolution {
  const selected = selectedId ? packages.find((entry) => entry.id === selectedId) ?? null : null;
  const fallbackDescriptor = createFallbackDescriptor(packages, mode);

  if (!selected) {
    return {
      requestedId: selectedId,
      resolvedMode: mode,
      descriptor: fallbackDescriptor,
      fallbackReason: selectedId ? "missing-theme" : null
    };
  }

  if (!selected.supports[mode]) {
    return {
      requestedId: selectedId,
      resolvedMode: mode,
      descriptor: fallbackDescriptor,
      fallbackReason: "unsupported-mode"
    };
  }

  return {
    requestedId: selectedId,
    resolvedMode: mode,
    descriptor: {
      id: selected.id,
      tokens: selected.tokens,
      styles: selected.styles
    },
    fallbackReason: null
  };
}
```

- [ ] **Step 3: Remove all old theme-family inputs from `App.tsx`**

In `src/renderer/editor/App.tsx`:

- delete:

```ts
type ThemeCatalogEntry = Awaited<ReturnType<Window["yulora"]["listThemes"]>>[number];
const [themes, setThemes] = useState<ThemeCatalogEntry[]>([]);
function toLegacyRuntimeThemePackageEntry(...) { ... }
```

- replace package state setup with:

```ts
const [themePackages, setThemePackages] = useState<
  Awaited<ReturnType<Window["yulora"]["listThemePackages"]>>
>([]);
```

- on startup, remove the `listThemes()` request and keep only:

```ts
void yulora
  .listThemePackages()
  .then((nextThemePackages) => {
    if (isCancelled) {
      return;
    }

    setThemePackages(nextThemePackages);
    setThemePackageCatalogState("loaded");
  })
  .catch(() => {
    if (isCancelled) {
      return;
    }

    setThemePackageCatalogState("failed");
  });
```

- where packages are normalized, use:

```ts
const activeThemePackages = themePackages.map(normalizeThemePackageDescriptor);
```

- [ ] **Step 4: Delete the old renderer family helpers**

Run:

```bash
git rm src/renderer/theme-catalog.ts
```

If `src/renderer/theme-runtime.ts` is only providing old builtin descriptor helpers, remove it too:

```bash
git rm src/renderer/theme-runtime.ts src/renderer/theme-runtime.test.ts
```

If part of `theme-runtime.ts` is still needed, reduce it until it no longer mentions:

- `ThemeDescriptor`
- `resolveBuiltinThemeDescriptor`
- `createBuiltinThemePackageDescriptor`

- [ ] **Step 5: Update renderer integration tests to be package-only**

In `src/renderer/app.autosave.test.ts`:

- remove all `listThemesResult` / `refreshThemesResult` options from `RenderEditorAppOptions`
- remove `ThemeDescriptor` test types and `communityThemes`
- remove `listThemes` and `refreshThemes` mocks from `beforeEach`
- keep only package mocks in `window.yulora`

Use this reduced setup shape:

```ts
type RenderEditorAppOptions = {
  listThemePackagesResult?: ThemePackageDescriptor[];
  refreshThemePackagesResult?: ThemePackageDescriptor[];
  getPreferencesResult?: Preferences;
};
```

- [ ] **Step 6: Run renderer-focused tests until green**

Run:

```bash
npm.cmd test -- src/renderer/theme-package-runtime.test.ts src/renderer/app.autosave.test.ts
```

Expected:

- PASS

- [ ] **Step 7: Commit the renderer package-only collapse**

```bash
git add src/renderer/theme-package-catalog.ts src/renderer/editor/App.tsx src/renderer/app.autosave.test.ts src/renderer/theme-package-runtime.test.ts
git add -u src/renderer/theme-catalog.ts src/renderer/theme-runtime.ts src/renderer/theme-runtime.test.ts
git commit -m "refactor: make renderer themes package-only"
```

### Task 5: Keep `rain-glass` external and update development flows

**Files:**
- Modify: `scripts/sync-dev-themes.mjs`
- Modify: `docs/theme-packages.md`
- Modify: `docs/test-cases.md`
- Keep/verify: `fixtures/themes/rain-glass/**`

- [ ] **Step 1: Add a failing integration test that external `rain-glass` still works through `listThemePackages()`**

In `src/renderer/app.autosave.test.ts`, keep or add a package fixture test shaped like:

```ts
it("loads rain-glass as an external package with shader parameters and surfaces", async () => {
  await renderEditorApp({
    getPreferencesResult: {
      ...DEFAULT_PREFERENCES,
      theme: {
        ...DEFAULT_PREFERENCES.theme,
        mode: "dark",
        selectedId: "rain-glass",
        effectsMode: "auto",
        parameters: {}
      }
    },
    listThemePackagesResult: [makeManifestThemePackage({ id: "rain-glass", name: "Rain Glass" })]
  });

  expect(document.head.querySelector('link[data-yulora-theme-part="tokens"]')?.getAttribute("href")).toContain("rain-glass");
});
```

- [ ] **Step 2: Tighten the dev sync script wording and assumptions**

In `scripts/sync-dev-themes.mjs`, keep the logic but add an inline comment near `FIXTURE_THEMES_DIR`:

```js
// Only external fixture theme packages are synced into dev userData/themes.
// Builtin themes ship from src/renderer/theme-packages and must not be copied here.
```

- [ ] **Step 3: Rewrite the package docs to remove legacy-family language**

At the top of `docs/theme-packages.md`, replace the introduction with:

```md
# Theme Packages

Yulora recognizes exactly one theme format: a manifest-driven theme package.

- Builtin packages ship from `src/renderer/theme-packages/`
- Community packages live under `<userData>/themes/<id>/`
- Directories without `manifest.json` are ignored
- Legacy css-only family directories are not supported
```

- [ ] **Step 4: Rewrite the manual test cases to match package-only installation**

In `docs/test-cases.md`, update `TC-093` and `TC-094` so the setup is:

```md
2. 在应用用户数据目录的 `themes` 下新建一个主题包目录（例如 `themes/demo`），并写入 `manifest.json`，再补上 manifest 引用的 `tokens` 和 `styles` 文件。
```

and add one expected bullet:

```md
- 不带 `manifest.json` 的旧目录不会被识别为主题
```

- [ ] **Step 5: Run the docs-adjacent verification tests**

Run:

```bash
npm.cmd test -- src/renderer/app.autosave.test.ts
```

Expected:

- PASS, including `rain-glass` package fixture coverage

- [ ] **Step 6: Commit the external package positioning and docs refresh**

```bash
git add scripts/sync-dev-themes.mjs docs/theme-packages.md docs/test-cases.md src/renderer/app.autosave.test.ts
git commit -m "docs: align themes around manifest packages"
```

### Task 6: Full verification and cleanup gate

**Files:**
- Modify as needed: any files left failing from earlier tasks

- [ ] **Step 1: Run the full unit and integration suite**

Run:

```bash
npm.cmd test
```

Expected:

- PASS

If it fails, fix the failing files before moving on.

- [ ] **Step 2: Run lint**

Run:

```bash
npm.cmd lint
```

Expected:

- PASS

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm.cmd typecheck
```

Expected:

- PASS

- [ ] **Step 4: Run production build**

Run:

```bash
npm.cmd build
```

Expected:

- PASS

- [ ] **Step 5: Inspect git diff for leftover compatibility traces**

Run:

```bash
rg -n "listThemes|refreshThemes|legacy-css-family|resolveLegacyThemeFamilyId|ThemeFamilyDescriptor|theme-service" src docs
```

Expected:

- no matches in active runtime code
- docs may mention the old design only in historical spec files, not in current guidance files

- [ ] **Step 6: Commit the final verification fixes**

```bash
git add -A
git commit -m "chore: finish theme package unification"
```

## Self-Review

### Spec coverage

- Single formal contract: covered by Tasks 1-4.
- Builtin `default` only: covered by Task 3.
- `default` light/dark fallback role: covered by Tasks 3-4.
- `rain-glass` external-only: covered by Task 5.
- No compatibility code: covered by Tasks 2, 4, and 6.
- Docs/test acceptance alignment: covered by Task 5.

### Placeholder scan

- No `TBD`, `TODO`, “similar to Task N”, or “add tests later” placeholders remain.
- Every task includes explicit files, commands, and expected outcomes.

### Type consistency

- Package-only type target is consistently `ThemePackageDescriptor` with `kind: "manifest-package"`.
- Renderer fallback target is consistently builtin `default`.
- No task reintroduces `ThemeDescriptor`, `ThemeFamilyDescriptor`, or legacy id migration helpers.
