# Shader Theme Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manifest-driven theme package system that supports CSS theme layers, controlled title bar layout, and Shadertoy-style fragment surfaces for animated workbench and title bar backgrounds.

**Architecture:** Keep `Preferences` as the single source of truth, extend the main-process theme discovery layer from raw CSS family folders to validated theme-package manifests, and expose normalized descriptors through preload. In the renderer, split “package styles” from “dynamic surfaces”: a theme package runtime mounts tokens/styles/layout metadata, while a separate surface runtime hosts shader-driven canvases with strict fallback and performance policy. The title bar remains a controlled host rendered by Yulora; theme packages configure it declaratively but never inject arbitrary logic.

**Tech Stack:** Electron, React 19, TypeScript, Vite, Vitest, CSS theme parts, WebGL fragment shaders

---

## File Structure

**New shared contracts**
- Create: `src/shared/theme-package.ts`
- Modify: `src/shared/preferences.ts`
- Test: `src/shared/theme-package.test.ts`
- Test: `src/shared/preferences.test.ts`

**New main-process discovery**
- Create: `src/main/theme-package-service.ts`
- Test: `src/main/theme-package-service.test.ts`
- Modify: `src/main/main.ts`

**Preload bridge**
- Modify: `src/preload/preload.ts`
- Test: `src/preload/preload.contract.test.ts`
- Test: `src/preload/preload.test.ts`

**Renderer theme runtime**
- Create: `src/renderer/theme-package-catalog.ts`
- Create: `src/renderer/theme-package-runtime.ts`
- Create: `src/renderer/theme-package-runtime.test.ts`
- Modify: `src/renderer/theme-runtime.ts`
- Modify: `src/renderer/theme-runtime.test.ts`
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/editor/settings-view.tsx`

**Renderer shader runtime**
- Create: `src/renderer/shader/theme-surface-runtime.ts`
- Create: `src/renderer/shader/theme-surface-runtime.test.ts`
- Create: `src/renderer/shader/theme-scene-state.ts`
- Create: `src/renderer/shader/theme-scene-state.test.ts`
- Create: `src/renderer/editor/ThemeSurfaceHost.tsx`

**Title bar host**
- Create: `src/renderer/editor/TitlebarHost.tsx`
- Create: `src/renderer/editor/titlebar-layout.ts`
- Create: `src/renderer/editor/titlebar-layout.test.ts`
- Modify: `src/main/runtime-windows.ts`
- Modify: `src/main/runtime-windows.test.ts`
- Modify: `src/renderer/styles/app-ui.css`

**Integration and docs**
- Modify: `src/renderer/app.autosave.test.ts`
- Create: `fixtures/themes/rain-glass/manifest.json`
- Create: `fixtures/themes/rain-glass/tokens/light.json`
- Create: `fixtures/themes/rain-glass/tokens/dark.json`
- Create: `fixtures/themes/rain-glass/styles/ui.css`
- Create: `fixtures/themes/rain-glass/styles/editor.css`
- Create: `fixtures/themes/rain-glass/styles/markdown.css`
- Create: `fixtures/themes/rain-glass/styles/titlebar.css`
- Create: `fixtures/themes/rain-glass/layout/titlebar.json`
- Create: `fixtures/themes/rain-glass/shaders/workbench-background.glsl`
- Create: `fixtures/themes/rain-glass/shaders/titlebar-backdrop.glsl`
- Create: `docs/theme-packages.md`

## Task 1: Shared Theme-Package Contract And Preferences

**Files:**
- Create: `src/shared/theme-package.ts`
- Test: `src/shared/theme-package.test.ts`
- Modify: `src/shared/preferences.ts`
- Test: `src/shared/preferences.test.ts`
- Test: `src/preload/preload.contract.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

```ts
// src/shared/theme-package.test.ts
import { describe, expect, it } from "vitest";

import {
  normalizeThemePackageManifest,
  type ThemePackageManifest
} from "./theme-package";

describe("normalizeThemePackageManifest", () => {
  it("keeps supported style, layout, and surface paths inside the package root", () => {
    const manifest = normalizeThemePackageManifest(
      {
        id: "rain-glass",
        name: "Rain Glass",
        version: "1.0.0",
        supports: { light: true, dark: true },
        styles: { ui: "./styles/ui.css", titlebar: "./styles/titlebar.css" },
        layout: { titlebar: "./layout/titlebar.json" },
        scene: { id: "rain-scene", sharedUniforms: { rainAmount: 0.7 } },
        surfaces: {
          workbenchBackground: {
            kind: "fragment",
            scene: "rain-scene",
            shader: "./shaders/workbench-background.glsl"
          }
        }
      },
      "/tmp/rain-glass"
    );

    expect(manifest).toMatchObject<Partial<ThemePackageManifest>>({
      id: "rain-glass",
      styles: {
        ui: "/tmp/rain-glass/styles/ui.css",
        titlebar: "/tmp/rain-glass/styles/titlebar.css"
      },
      layout: {
        titlebar: "/tmp/rain-glass/layout/titlebar.json"
      },
      surfaces: {
        workbenchBackground: {
          kind: "fragment",
          shader: "/tmp/rain-glass/shaders/workbench-background.glsl"
        }
      }
    });
  });
});

// src/shared/preferences.test.ts
it("normalizes theme effects mode to auto/full/off", () => {
  expect(normalizePreferences({ theme: { effectsMode: "auto" } }).theme.effectsMode).toBe("auto");
  expect(normalizePreferences({ theme: { effectsMode: "full" } }).theme.effectsMode).toBe("full");
  expect(normalizePreferences({ theme: { effectsMode: "off" } }).theme.effectsMode).toBe("off");
  expect(normalizePreferences({ theme: { effectsMode: "storm" } }).theme.effectsMode).toBe("auto");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/shared/theme-package.test.ts src/shared/preferences.test.ts src/preload/preload.contract.test.ts`

Expected: FAIL with missing-module and missing-property errors for `theme-package.ts` and `theme.effectsMode`.

- [ ] **Step 3: Add the shared manifest contract and effects-mode preference**

```ts
// src/shared/theme-package.ts
export type ThemeEffectsMode = "auto" | "full" | "off";
export type ThemeSurfaceSlot = "workbenchBackground" | "titlebarBackdrop" | "welcomeHero";
export type ThemeStylePart = "ui" | "editor" | "markdown" | "titlebar";

export type ThemePackageManifest = {
  id: string;
  name: string;
  version: string;
  author: string | null;
  supports: { light: boolean; dark: boolean };
  tokens: Partial<Record<"light" | "dark", string>>;
  styles: Partial<Record<ThemeStylePart, string>>;
  layout: { titlebar: string | null };
  scene: { id: string; sharedUniforms: Record<string, number> } | null;
  surfaces: Partial<Record<ThemeSurfaceSlot, ThemeSurfaceDescriptor>>;
};

export function normalizeThemePackageManifest(
  raw: unknown,
  packageRoot: string
): ThemePackageManifest | null {
  const source = isRecord(raw) ? raw : null;
  if (!source || typeof source.id !== "string" || typeof source.name !== "string") {
    return null;
  }

  return {
    id: source.id.trim(),
    name: source.name.trim(),
    version: typeof source.version === "string" ? source.version : "1.0.0",
    author: typeof source.author === "string" ? source.author : null,
    supports: normalizeSupports(source.supports),
    tokens: normalizeThemeModePathMap(source.tokens, packageRoot),
    styles: normalizeThemeStylePathMap(source.styles, packageRoot),
    layout: {
      titlebar: resolvePackagePath(isRecord(source.layout) ? source.layout.titlebar : null, packageRoot)
    },
    scene: normalizeThemeScene(source.scene),
    surfaces: normalizeThemeSurfaces(source.surfaces, packageRoot)
  };
}
```

```ts
// src/shared/preferences.ts
export type ThemePreferences = {
  mode: ThemeMode;
  selectedId: string | null;
  effectsMode: "auto" | "full" | "off";
};

export const DEFAULT_PREFERENCES: Preferences = {
  version: PREFERENCES_SCHEMA_VERSION,
  autosave: {
    idleDelayMs: 1000
  },
  recentFiles: {
    maxEntries: 10
  },
  ui: {
    fontSize: null
  },
  document: {
    fontFamily: null,
    cjkFontFamily: null,
    fontSize: null
  },
  theme: {
    mode: "system",
    selectedId: null,
    effectsMode: "auto"
  }
};
```

```ts
// src/preload/preload.contract.test.ts
const updatePreferencesInput: PreferencesUpdate = {
  theme: { effectsMode: "off" }
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/shared/theme-package.test.ts src/shared/preferences.test.ts src/preload/preload.contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/theme-package.ts src/shared/theme-package.test.ts src/shared/preferences.ts src/shared/preferences.test.ts src/preload/preload.contract.test.ts
git commit -m "feat: add shared theme package contract"
```

## Task 2: Main-Process Theme-Package Discovery And IPC

**Files:**
- Create: `src/main/theme-package-service.ts`
- Test: `src/main/theme-package-service.test.ts`
- Modify: `src/main/main.ts`
- Modify: `src/preload/preload.ts`
- Test: `src/preload/preload.test.ts`

- [ ] **Step 1: Write the failing discovery and IPC tests**

```ts
// src/main/theme-package-service.test.ts
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createThemePackageService } from "./theme-package-service";

it("discovers manifest-driven theme packages and legacy CSS families together", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yulora-theme-packages-"));
  const userDataDir = path.join(root, "userdata");
  await mkdir(path.join(userDataDir, "themes", "rain-glass", "styles"), { recursive: true });
  await writeFile(
    path.join(userDataDir, "themes", "rain-glass", "manifest.json"),
    JSON.stringify({
      id: "rain-glass",
      name: "Rain Glass",
      version: "1.0.0",
      supports: { light: true, dark: true },
      styles: { ui: "./styles/ui.css" }
    }),
    "utf8"
  );
  await writeFile(path.join(userDataDir, "themes", "rain-glass", "styles", "ui.css"), "/* ui */");
  await mkdir(path.join(userDataDir, "themes", "graphite", "dark"), { recursive: true });
  await writeFile(path.join(userDataDir, "themes", "graphite", "dark", "ui.css"), "/* legacy */");

  const service = createThemePackageService({ userDataDir });
  const packages = await service.listThemePackages();

  expect(packages.map((entry) => entry.id)).toEqual(["graphite", "rain-glass"]);
  expect(packages.find((entry) => entry.id === "rain-glass")?.manifest.name).toBe("Rain Glass");
  expect(packages.find((entry) => entry.id === "graphite")?.kind).toBe("legacy-css-family");

  await rm(root, { recursive: true, force: true });
});

// src/preload/preload.test.ts
void api.listThemePackages();
void api.refreshThemePackages();

expect(invoke.mock.calls).toContainEqual(["yulora:list-theme-packages"]);
expect(invoke.mock.calls).toContainEqual(["yulora:refresh-theme-packages"]);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/main/theme-package-service.test.ts src/preload/preload.test.ts`

Expected: FAIL because `createThemePackageService`, `listThemePackages`, and `refreshThemePackages` do not exist.

- [ ] **Step 3: Implement manifest discovery, legacy adaptation, and preload IPC**

```ts
// src/main/theme-package-service.ts
export type ThemePackageDescriptor = {
  id: string;
  kind: "manifest-package" | "legacy-css-family";
  source: "builtin" | "community";
  packageRoot: string;
  manifest: ThemePackageManifest;
};

export function createThemePackageService(input: CreateThemePackageServiceInput) {
  async function scanThemePackages(): Promise<ThemePackageDescriptor[]> {
    const themesDir = path.join(input.userDataDir, "themes");
    const entries = await safeReadDir(themesDir);
    const packages = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const packageRoot = path.join(themesDir, entry.name);
          const manifest = await readManifestIfPresent(path.join(packageRoot, "manifest.json"), packageRoot);

          return manifest
            ? {
                id: manifest.id,
                kind: "manifest-package" as const,
                source: "community" as const,
                packageRoot,
                manifest
              }
            : createLegacyCssFamilyDescriptor(packageRoot, entry.name);
        })
    );

    return packages.filter(Boolean).sort((left, right) => left.id.localeCompare(right.id));
  }

  return {
    async listThemePackages() {
      cache ??= await scanThemePackages();
      return [...cache];
    },
    async refreshThemePackages() {
      cache = await scanThemePackages();
      return [...cache];
    }
  };
}
```

```ts
// src/main/main.ts
const LIST_THEME_PACKAGES_CHANNEL = "yulora:list-theme-packages";
const REFRESH_THEME_PACKAGES_CHANNEL = "yulora:refresh-theme-packages";

const themePackageService = createThemePackageService({
  userDataDir: app.getPath("userData")
});

ipcMain.handle(LIST_THEME_PACKAGES_CHANNEL, async () => themePackageService.listThemePackages());
ipcMain.handle(REFRESH_THEME_PACKAGES_CHANNEL, async () => themePackageService.refreshThemePackages());
```

```ts
// src/preload/preload.ts
const LIST_THEME_PACKAGES_CHANNEL = "yulora:list-theme-packages";
const REFRESH_THEME_PACKAGES_CHANNEL = "yulora:refresh-theme-packages";

const api = {
  platform: process.platform,
  runtimeMode: resolveRuntimeModeFromArgv(process.argv ?? []),
  startupOpenPath: resolveStartupOpenPathFromArgv(process.argv ?? []),
  getPreferences: (): Promise<Preferences> => ipcRenderer.invoke(GET_PREFERENCES_CHANNEL),
  updatePreferences: (patch: PreferencesUpdate): Promise<UpdatePreferencesResult> =>
    ipcRenderer.invoke(UPDATE_PREFERENCES_CHANNEL, patch),
  listThemePackages: () => ipcRenderer.invoke(LIST_THEME_PACKAGES_CHANNEL),
  refreshThemePackages: () => ipcRenderer.invoke(REFRESH_THEME_PACKAGES_CHANNEL)
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/main/theme-package-service.test.ts src/preload/preload.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/theme-package-service.ts src/main/theme-package-service.test.ts src/main/main.ts src/preload/preload.ts src/preload/preload.test.ts
git commit -m "feat: discover manifest theme packages"
```

## Task 3: Renderer Package Catalog And Style Runtime

**Files:**
- Create: `src/renderer/theme-package-catalog.ts`
- Create: `src/renderer/theme-package-runtime.ts`
- Create: `src/renderer/theme-package-runtime.test.ts`
- Modify: `src/renderer/theme-runtime.ts`
- Modify: `src/renderer/theme-runtime.test.ts`
- Modify: `src/renderer/editor/App.tsx`

- [ ] **Step 1: Write the failing renderer runtime tests**

```ts
// src/renderer/theme-package-runtime.test.ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { createThemePackageRuntime } from "./theme-package-runtime";

describe("theme package runtime", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("mounts tokens, ui, titlebar, editor, and markdown links in stable order", () => {
    const runtime = createThemePackageRuntime(document);

    runtime.applyPackage({
      id: "rain-glass",
      styles: {
        ui: "file:///theme/ui.css",
        titlebar: "file:///theme/titlebar.css",
        editor: "file:///theme/editor.css"
      },
      tokens: {
        dark: "file:///theme/tokens-dark.css"
      }
    }, "dark");

    expect(
      Array.from(document.head.querySelectorAll("link[data-yulora-theme-part]")).map(
        (node) => node.getAttribute("href")
      )
    ).toEqual([
      "file:///theme/tokens-dark.css",
      "file:///theme/ui.css",
      "file:///theme/titlebar.css",
      "file:///theme/editor.css"
    ]);
  });
});

// src/renderer/theme-runtime.test.ts
it("keeps builtin default descriptors available for package fallback", () => {
  expect(resolveBuiltinThemeDescriptor("light").id).toBe("default");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/renderer/theme-package-runtime.test.ts src/renderer/theme-runtime.test.ts`

Expected: FAIL because `createThemePackageRuntime` does not exist and the old runtime does not understand `titlebar`.

- [ ] **Step 3: Implement package-level style resolution and default fallback**

```ts
// src/renderer/theme-package-runtime.ts
export const THEME_STYLE_ORDER = ["tokens", "ui", "titlebar", "editor", "markdown"] as const;

export function createThemePackageRuntime(document: Document) {
  const mountedLinks = new Map<string, HTMLLinkElement>();

  function applyPackage(themePackage: ActiveThemePackageDescriptor | null, mode: "light" | "dark"): void {
    const partUrls = {
      tokens: themePackage?.tokens[mode] ?? null,
      ui: themePackage?.styles.ui ?? null,
      titlebar: themePackage?.styles.titlebar ?? null,
      editor: themePackage?.styles.editor ?? null,
      markdown: themePackage?.styles.markdown ?? null
    };

    for (const part of THEME_STYLE_ORDER) {
      syncThemeLink(document, mountedLinks, part, partUrls[part]);
    }
  }

  return { applyPackage, clear };
}
```

```ts
// src/renderer/theme-package-catalog.ts
export function resolveActiveThemePackage(
  selectedId: string | null,
  packages: ThemePackageDescriptor[],
  mode: "light" | "dark"
): ActiveThemePackageResolution {
  const builtinDefault = packages.find((entry) => entry.id === "default")!;
  const selected = selectedId ? packages.find((entry) => entry.id === selectedId) ?? null : null;

  if (!selected) {
    return {
      requestedId: selectedId,
      descriptor: builtinDefault.manifest,
      fallbackReason: selectedId ? "missing-theme" : null
    };
  }

  if (!selected.manifest.supports[mode]) {
    return {
      requestedId: selectedId,
      descriptor: builtinDefault.manifest,
      fallbackReason: "unsupported-mode"
    };
  }

  return {
    requestedId: selectedId,
    descriptor: selected.manifest,
    fallbackReason: null
  };
}
```

```ts
// src/renderer/editor/App.tsx
const [themePackages, setThemePackages] = useState<ThemePackageEntry[]>([]);
const themePackageRuntimeRef = useRef<ReturnType<typeof createThemePackageRuntime> | null>(null);

const activeThemePackage = resolveActiveThemePackage(
  preferences.theme.selectedId,
  themePackages,
  resolvedThemeMode
);

themePackageRuntimeRef.current?.applyPackage(activeThemePackage.descriptor, resolvedThemeMode);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/renderer/theme-package-runtime.test.ts src/renderer/theme-runtime.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/theme-package-catalog.ts src/renderer/theme-package-runtime.ts src/renderer/theme-package-runtime.test.ts src/renderer/theme-runtime.ts src/renderer/theme-runtime.test.ts src/renderer/editor/App.tsx
git commit -m "feat: mount theme package styles in renderer"
```

## Task 4: Settings UI And Theme Effects Preference

**Files:**
- Modify: `src/renderer/editor/settings-view.tsx`
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/shared/preferences.ts`
- Test: `src/renderer/app.autosave.test.ts`

- [ ] **Step 1: Write the failing settings and integration tests**

```ts
// src/renderer/app.autosave.test.ts
it("persists theme effects mode changes from settings", async () => {
  const driver = await renderEditorApp();

  await driver.openSettings();
  await driver.selectSettingsOption("settings-theme-effects", "off");

  expect(window.yulora.updatePreferences).toHaveBeenCalledWith({
    theme: { effectsMode: "off" }
  });
});

it("shows the selected manifest package in the theme picker", async () => {
  const driver = await renderEditorApp({
    listThemePackagesResult: [
      makeManifestThemePackage({ id: "rain-glass", name: "Rain Glass" })
    ]
  });

  await driver.openSettings();

  expect(driver.getByLabelText("主题包")).toHaveValue("rain-glass");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/renderer/app.autosave.test.ts`

Expected: FAIL because there is no effects-mode control and the renderer still loads the old theme list API.

- [ ] **Step 3: Add the new settings controls and package refresh flow**

```tsx
// src/renderer/editor/settings-view.tsx
const THEME_EFFECT_LABELS = {
  auto: "自动",
  full: "始终开启",
  off: "关闭"
} as const;

function handleThemeEffectsModeChange(value: "auto" | "full" | "off"): void {
  void applyPatch({ theme: { effectsMode: value } });
}

<div className="settings-row">
  <label className="settings-label" htmlFor="settings-theme-effects">
    <span>动态效果</span>
    <span className="settings-hint">自动模式会在低性能或减少动态效果场景下自动降级。</span>
  </label>
  <select
    id="settings-theme-effects"
    className="settings-input settings-select"
    value={preferences.theme.effectsMode}
    onChange={(event) => handleThemeEffectsModeChange(event.target.value as "auto" | "full" | "off")}
  >
    {(["auto", "full", "off"] as const).map((mode) => (
      <option key={mode} value={mode}>{THEME_EFFECT_LABELS[mode]}</option>
    ))}
  </select>
</div>
```

```ts
// src/renderer/editor/App.tsx
const [isRefreshingThemePackages, setIsRefreshingThemePackages] = useState(false);

const handleRefreshThemePackages = useEffectEvent(async (): Promise<void> => {
  setIsRefreshingThemePackages(true);
  try {
    setThemePackages(await yulora.refreshThemePackages());
  } finally {
    setIsRefreshingThemePackages(false);
  }
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/renderer/app.autosave.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/editor/settings-view.tsx src/renderer/editor/App.tsx src/shared/preferences.ts src/renderer/app.autosave.test.ts
git commit -m "feat: add theme effects settings"
```

## Task 5: Workbench Background Fragment Surface Runtime

**Files:**
- Create: `src/renderer/shader/theme-scene-state.ts`
- Create: `src/renderer/shader/theme-scene-state.test.ts`
- Create: `src/renderer/shader/theme-surface-runtime.ts`
- Create: `src/renderer/shader/theme-surface-runtime.test.ts`
- Create: `src/renderer/editor/ThemeSurfaceHost.tsx`
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/styles/app-ui.css`

- [ ] **Step 1: Write the failing scene-state and surface-runtime tests**

```ts
// src/renderer/shader/theme-scene-state.test.ts
import { describe, expect, it } from "vitest";

import { createThemeSceneState } from "./theme-scene-state";

it("shares time and uniform state across workbench and titlebar surfaces", () => {
  const scene = createThemeSceneState({
    sceneId: "rain-scene",
    effectsMode: "full",
    sharedUniforms: { rainAmount: 0.7 }
  });

  const workbenchFrame = scene.nextFrame("workbenchBackground", { width: 1200, height: 800 });
  const titlebarFrame = scene.nextFrame("titlebarBackdrop", { width: 1200, height: 44 });

  expect(workbenchFrame.time).toBe(titlebarFrame.time);
  expect(titlebarFrame.uniforms.rainAmount).toBe(0.7);
});

// src/renderer/shader/theme-surface-runtime.test.ts
it("falls back to static mode when shader compilation fails", async () => {
  const runtime = createThemeSurfaceRuntime(makeWebGlFactoryThatFails());

  const result = await runtime.mount({
    surface: "workbenchBackground",
    shaderSource: "void mainImage(out vec4 c, in vec2 f) { c = vec4(1.); }",
    effectsMode: "auto"
  });

  expect(result.mode).toBe("fallback");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/renderer/shader/theme-scene-state.test.ts src/renderer/shader/theme-surface-runtime.test.ts`

Expected: FAIL because the scene-state and surface-runtime modules do not exist.

- [ ] **Step 3: Implement the shared scene clock and fragment-surface runtime**

```ts
// src/renderer/shader/theme-scene-state.ts
export function createThemeSceneState(input: {
  sceneId: string;
  effectsMode: "auto" | "full" | "off";
  sharedUniforms: Record<string, number>;
}) {
  const startedAt = performance.now();

  function nextFrame(surface: ThemeSurfaceSlot, viewport: { width: number; height: number }) {
    const time = (performance.now() - startedAt) / 1000;
    return {
      surface,
      time,
      viewport,
      uniforms: input.sharedUniforms
    };
  }

  return { nextFrame };
}
```

```ts
// src/renderer/shader/theme-surface-runtime.ts
export function createThemeSurfaceRuntime(factory: ThemeSurfaceGlFactory) {
  async function mount(input: MountThemeSurfaceInput): Promise<{ mode: "full" | "reduced" | "fallback" }> {
    if (input.effectsMode === "off") {
      return { mode: "fallback" };
    }

    try {
      await factory.createProgram(input.shaderSource, input.channels ?? {});
      return { mode: input.effectsMode === "full" ? "full" : "reduced" };
    } catch {
      return { mode: "fallback" };
    }
  }

  return { mount };
}
```

```tsx
// src/renderer/editor/ThemeSurfaceHost.tsx
export function ThemeSurfaceHost({ surface, descriptor, sceneState }: ThemeSurfaceHostProps) {
  return (
    <div className="theme-surface-host" data-yulora-theme-surface={surface}>
      <canvas aria-hidden="true" />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/renderer/shader/theme-scene-state.test.ts src/renderer/shader/theme-surface-runtime.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/shader/theme-scene-state.ts src/renderer/shader/theme-scene-state.test.ts src/renderer/shader/theme-surface-runtime.ts src/renderer/shader/theme-surface-runtime.test.ts src/renderer/editor/ThemeSurfaceHost.tsx src/renderer/editor/App.tsx src/renderer/styles/app-ui.css
git commit -m "feat: add workbench shader surface runtime"
```

## Task 6: Controlled Title Bar Host And Window Chrome

**Files:**
- Create: `src/renderer/editor/titlebar-layout.ts`
- Create: `src/renderer/editor/titlebar-layout.test.ts`
- Create: `src/renderer/editor/TitlebarHost.tsx`
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/main/runtime-windows.ts`
- Modify: `src/main/runtime-windows.test.ts`
- Modify: `src/renderer/styles/app-ui.css`

- [ ] **Step 1: Write the failing titlebar-layout and window tests**

```ts
// src/renderer/editor/titlebar-layout.test.ts
import { describe, expect, it } from "vitest";

import { normalizeTitlebarLayout } from "./titlebar-layout";

it("keeps only supported titlebar items and drag regions", () => {
  expect(
    normalizeTitlebarLayout({
      height: 44,
      slots: {
        leading: ["app-icon"],
        center: ["document-title"],
        trailing: ["window-actions", "custom-widget"]
      },
      dragRegions: ["leading", "center", "custom"]
    })
  ).toEqual({
    height: 44,
    slots: {
      leading: ["app-icon"],
      center: ["document-title"],
      trailing: ["window-actions"]
    },
    dragRegions: ["leading", "center"]
  });
});

// src/main/runtime-windows.test.ts
it("configures BrowserWindow for the controlled custom title bar", () => {
  const manager = createRuntimeWindowManager({
    runtimeMode: "editor",
    preloadPath: "/tmp/preload.js",
    showStrategy: "immediate",
    createWindow,
    getAllWindows: () => [],
    loadRenderer: vi.fn()
  });

  manager.openPrimaryWindow();

  expect(createWindow).toHaveBeenCalledWith(
    expect.objectContaining({
      titleBarStyle: "hiddenInset"
    })
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/renderer/editor/titlebar-layout.test.ts src/main/runtime-windows.test.ts`

Expected: FAIL because the titlebar layout module and the extra `BrowserWindow` options are not implemented.

- [ ] **Step 3: Implement the controlled title bar shell**

```ts
// src/renderer/editor/titlebar-layout.ts
const TITLEBAR_ITEMS = ["app-icon", "document-title", "dirty-indicator", "theme-toggle", "window-actions"] as const;
const DRAG_REGIONS = ["leading", "center", "trailing"] as const;

export function normalizeTitlebarLayout(raw: unknown): TitlebarLayoutDescriptor {
  const source = isRecord(raw) ? raw : {};
  const slots = isRecord(source.slots) ? source.slots : {};

  return {
    height: clampInteger(typeof source.height === "number" ? source.height : 44, 36, 60),
    slots: {
      leading: normalizeTitlebarItems(slots.leading, TITLEBAR_ITEMS),
      center: normalizeTitlebarItems(slots.center, TITLEBAR_ITEMS),
      trailing: normalizeTitlebarItems(slots.trailing, TITLEBAR_ITEMS)
    },
    dragRegions: normalizeTitlebarRegions(source.dragRegions, DRAG_REGIONS),
    compactWhenNarrow: source.compactWhenNarrow !== false
  };
}
```

```tsx
// src/renderer/editor/TitlebarHost.tsx
export function TitlebarHost({ layout, titlebarSurface, title }: TitlebarHostProps) {
  return (
    <header className="app-titlebar" data-yulora-role="titlebar">
      <ThemeSurfaceHost surface="titlebarBackdrop" descriptor={titlebarSurface} />
      <div className="app-titlebar-leading" data-yulora-drag-region={layout.dragRegions.includes("leading")} />
      <div className="app-titlebar-center" data-yulora-drag-region={layout.dragRegions.includes("center")}>
        <span className="app-titlebar-document-title">{title}</span>
      </div>
      <div className="app-titlebar-trailing" />
    </header>
  );
}
```

```ts
// src/main/runtime-windows.ts
type CreateWindowInput = {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  title: string;
  icon?: string;
  frame?: boolean;
  titleBarStyle?: "hiddenInset" | "default";
  titleBarOverlay?: boolean;
  webPreferences: {
    preload: string;
    contextIsolation: true;
    nodeIntegration: false;
    additionalArguments: string[];
  };
};

const sharedChrome =
  nextRuntimeMode !== "editor"
    ? {}
    : process.platform === "darwin"
      ? { frame: false, titleBarStyle: "hiddenInset" as const, titleBarOverlay: false }
      : process.platform === "win32"
        ? { frame: false, titleBarStyle: "default" as const, titleBarOverlay: true }
        : { frame: false, titleBarStyle: "default" as const, titleBarOverlay: false };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/renderer/editor/titlebar-layout.test.ts src/main/runtime-windows.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/editor/titlebar-layout.ts src/renderer/editor/titlebar-layout.test.ts src/renderer/editor/TitlebarHost.tsx src/renderer/editor/App.tsx src/main/runtime-windows.ts src/main/runtime-windows.test.ts src/renderer/styles/app-ui.css
git commit -m "feat: add controlled themeable title bar"
```

## Task 7: Fallback Policy, Sample Theme Package, And Author Docs

**Files:**
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/app.autosave.test.ts`
- Create: `fixtures/themes/rain-glass/manifest.json`
- Create: `fixtures/themes/rain-glass/tokens/light.json`
- Create: `fixtures/themes/rain-glass/tokens/dark.json`
- Create: `fixtures/themes/rain-glass/styles/ui.css`
- Create: `fixtures/themes/rain-glass/styles/editor.css`
- Create: `fixtures/themes/rain-glass/styles/markdown.css`
- Create: `fixtures/themes/rain-glass/styles/titlebar.css`
- Create: `fixtures/themes/rain-glass/layout/titlebar.json`
- Create: `fixtures/themes/rain-glass/shaders/workbench-background.glsl`
- Create: `fixtures/themes/rain-glass/shaders/titlebar-backdrop.glsl`
- Create: `docs/theme-packages.md`

- [ ] **Step 1: Write the failing fallback and fixture tests**

```ts
// src/renderer/app.autosave.test.ts
it("falls back to static package styling when a shader surface fails to initialize", async () => {
  const driver = await renderEditorApp({
    listThemePackagesResult: [makeManifestThemePackage({ id: "rain-glass" })],
    shaderFactory: makeShaderFactoryThatFails()
  });

  expect(driver.queryByText("主题动态效果已自动关闭，已回退到静态样式。")).not.toBeNull();
  expect(driver.documentElement().dataset.yuloraThemeDynamicMode).toBe("fallback");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/renderer/app.autosave.test.ts`

Expected: FAIL because there is no dynamic-mode state or fallback notification yet.

- [ ] **Step 3: Implement fallback notifications, sample package, and author docs**

```ts
// src/renderer/editor/App.tsx
const themeDynamicMode = activeSceneRuntime.mode;

useEffect(() => {
  document.documentElement.dataset.yuloraThemeDynamicMode = themeDynamicMode;
}, [themeDynamicMode]);

if (themeDynamicMode === "fallback") {
  showNotification({
    kind: "warning",
    message: "主题动态效果已自动关闭，已回退到静态样式。"
  });
}
```

```json
// fixtures/themes/rain-glass/manifest.json
{
  "id": "rain-glass",
  "name": "Rain Glass",
  "version": "1.0.0",
  "author": "Yulora",
  "supports": { "light": true, "dark": true },
  "tokens": {
    "light": "./tokens/light.json",
    "dark": "./tokens/dark.json"
  },
  "styles": {
    "ui": "./styles/ui.css",
    "editor": "./styles/editor.css",
    "markdown": "./styles/markdown.css",
    "titlebar": "./styles/titlebar.css"
  },
  "layout": { "titlebar": "./layout/titlebar.json" },
  "scene": { "id": "rain-scene", "sharedUniforms": { "rainAmount": 0.72, "glassBlur": 0.58 } },
  "surfaces": {
    "workbenchBackground": {
      "kind": "fragment",
      "scene": "rain-scene",
      "shader": "./shaders/workbench-background.glsl"
    },
    "titlebarBackdrop": {
      "kind": "fragment",
      "scene": "rain-scene",
      "shader": "./shaders/titlebar-backdrop.glsl",
      "transparent": true
    }
  }
}
```

```md
<!-- docs/theme-packages.md -->
# Theme Packages

## Required files
- `manifest.json`
- Optional `tokens/`, `styles/`, `layout/`, `shaders/`, `assets/`

## Supported surfaces
- `workbenchBackground`
- `titlebarBackdrop`
- `welcomeHero`

## Supported shader inputs
- `iTime`
- `iResolution`
- `iMouse`
- `iFrame`
- `iChannel0..iChannel3`
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/renderer/app.autosave.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/editor/App.tsx src/renderer/app.autosave.test.ts fixtures/themes/rain-glass docs/theme-packages.md
git commit -m "feat: add shader theme fallback and sample package"
```

## Task 8: Full Verification And Packaging Sanity Check

**Files:**
- Modify: any files touched in Tasks 1-7 only

- [ ] **Step 1: Run the focused test suites again**

Run:

```bash
npx vitest run \
  src/shared/theme-package.test.ts \
  src/shared/preferences.test.ts \
  src/main/theme-package-service.test.ts \
  src/preload/preload.contract.test.ts \
  src/preload/preload.test.ts \
  src/renderer/theme-package-runtime.test.ts \
  src/renderer/theme-runtime.test.ts \
  src/renderer/shader/theme-scene-state.test.ts \
  src/renderer/shader/theme-surface-runtime.test.ts \
  src/renderer/editor/titlebar-layout.test.ts \
  src/main/runtime-windows.test.ts \
  src/renderer/app.autosave.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint, typecheck, and full test**

Run:

```bash
npm run lint
npm run typecheck
npm test
```

Expected:
- `npm run lint`: exits 0
- `npm run typecheck`: exits 0
- `npm test`: exits 0

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS and updated `dist/`, `dist-electron/`, and `dist-cli/` outputs.

- [ ] **Step 4: Manual sanity-check in Electron**

Run: `npm run dev`

Expected:
- The app opens with the controlled title bar shell.
- Selecting `Rain Glass` in settings updates styles immediately.
- `workbenchBackground` animates when effects mode is `auto` or `full`.
- Switching effects mode to `off` leaves the static theme readable.
- Shader failure or unsupported context falls back to static theme without breaking typing or save flows.

- [ ] **Step 5: Commit**

```bash
git add src/main src/preload src/shared src/renderer fixtures/themes/rain-glass docs/theme-packages.md
git commit -m "feat: ship shader theme packages"
```
