# TASK-025 Test Workbench Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated Electron test workbench window, a test-mode startup entry, and a static scenario-list shell without disrupting the in-progress editor work from `TASK-003`.

**Architecture:** Keep `TASK-003`'s editor renderer on `src/renderer/App.tsx` and introduce a separate workbench renderer entry (`test-workbench.html` + `test-workbench-main.tsx`) so most Task-025 code lands in new files. Use `YULORA_MODE=test-workbench` as the single startup switch, wrap it with dedicated npm scripts, and keep shared-file edits limited to thin routing in `src/main/main.ts`, `src/main/paths.ts`, and `vite.config.ts`.

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest

---

### Task 1: Add app-mode parsing and multi-page renderer resolution

**Files:**
- Create: `src/shared/test-workbench.ts`
- Create: `src/main/app-mode.ts`
- Create: `src/main/app-mode.test.ts`
- Modify: `src/main/paths.ts`
- Modify: `src/main/paths.test.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing tests for mode parsing and workbench page resolution**

```ts
import { describe, expect, it } from "vitest";

import { resolveAppMode } from "./app-mode";

describe("resolveAppMode", () => {
  it("defaults to editor mode", () => {
    expect(resolveAppMode(undefined)).toBe("editor");
  });

  it("accepts the explicit test-workbench mode", () => {
    expect(resolveAppMode("test-workbench")).toBe("test-workbench");
  });

  it("falls back to editor for unknown values", () => {
    expect(resolveAppMode("staging-shell")).toBe("editor");
  });
});
```

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRendererEntry } from "./paths";

describe("resolveRendererEntry", () => {
  it("resolves the workbench html in build output", () => {
    expect(resolveRendererEntry("/tmp/dist", undefined, "test-workbench")).toBe(
      path.join("/tmp/dist", "test-workbench.html")
    );
  });

  it("resolves the workbench page through the dev server", () => {
    expect(
      resolveRendererEntry("/tmp/dist", "http://127.0.0.1:5173", "test-workbench")
    ).toBe("http://127.0.0.1:5173/test-workbench.html");
  });
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/main/app-mode.test.ts src/main/paths.test.ts`
Expected: FAIL because `src/main/app-mode.ts` does not exist yet and `resolveRendererEntry()` does not support page selection

- [ ] **Step 3: Add the minimal shared constants and mode parser**

```ts
export const OPEN_EDITOR_WINDOW_CHANNEL = "yulora:test-workbench/open-editor-window";

export type YuloraAppMode = "editor" | "test-workbench";
export type RendererPage = "index" | "test-workbench";

export function isWorkbenchMode(mode: YuloraAppMode): boolean {
  return mode === "test-workbench";
}
```

```ts
import type { YuloraAppMode } from "../shared/test-workbench";

export function resolveAppMode(rawMode = process.env.YULORA_MODE): YuloraAppMode {
  return rawMode === "test-workbench" ? "test-workbench" : "editor";
}
```

- [ ] **Step 4: Extend renderer entry resolution to support the isolated workbench page**

```ts
import path from "node:path";

import type { RendererPage } from "../shared/test-workbench";

function getRendererHtmlFile(page: RendererPage): string {
  return page === "test-workbench" ? "test-workbench.html" : "index.html";
}

export function resolveRendererEntry(
  distDir: string,
  devServerUrl?: string,
  page: RendererPage = "index"
): string {
  const htmlFile = getRendererHtmlFile(page);

  if (devServerUrl) {
    return new URL(htmlFile, `${devServerUrl}/`).toString();
  }

  return path.join(distDir, htmlFile);
}
```

- [ ] **Step 5: Add the workbench dev scripts and Vite multi-page build**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: "src/renderer",
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, "src/renderer/index.html"),
        "test-workbench": path.resolve(__dirname, "src/renderer/test-workbench.html")
      }
    }
  }
});
```

```json
{
  "scripts": {
    "dev:test-workbench": "concurrently -k \"npm:dev:electron:test-workbench\" \"npm:dev:renderer\" \"npm:dev:main\"",
    "dev:electron:test-workbench": "wait-on dist-electron/main/main.js dist-electron/preload/preload.js dist-electron/preload/test-workbench-preload.js http://localhost:5173 && node ./node_modules/cross-env/dist/bin/cross-env.js YULORA_MODE=test-workbench VITE_DEV_SERVER_URL=http://localhost:5173 electron ."
  }
}
```

- [ ] **Step 6: Re-run the focused tests**

Run: `npm test -- src/main/app-mode.test.ts src/main/paths.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/test-workbench.ts src/main/app-mode.ts src/main/app-mode.test.ts src/main/paths.ts src/main/paths.test.ts vite.config.ts package.json
git commit -m "feat: add test workbench startup mode"
```

### Task 2: Add isolated window factories and test-mode lifecycle wiring

**Files:**
- Create: `src/main/editor-window.ts`
- Create: `src/main/test-workbench-window.ts`
- Modify: `src/main/main.ts`

- [ ] **Step 1: Re-read the shared main-process diff before editing**

Run: `git diff -- src/main/main.ts`
Expected: Review the latest `TASK-003` changes first so the Task-025 patch layers on top instead of overwriting them

- [ ] **Step 2: Write the failing lifecycle test for the startup decision**

```ts
import { describe, expect, it } from "vitest";

import { getInitialWindowKind } from "./app-mode";

describe("getInitialWindowKind", () => {
  it("starts with the workbench in test mode", () => {
    expect(getInitialWindowKind("test-workbench")).toBe("test-workbench");
  });

  it("starts with the editor in default mode", () => {
    expect(getInitialWindowKind("editor")).toBe("editor");
  });
});
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `npm test -- src/main/app-mode.test.ts`
Expected: FAIL because `getInitialWindowKind()` does not exist yet

- [ ] **Step 4: Add focused window factories so shared code only handles orchestration**

```ts
import path from "node:path";
import { BrowserWindow } from "electron";

import { resolveRendererEntry } from "./paths";

export function createEditorWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const entry = resolveRendererEntry(
    path.join(__dirname, "../../dist"),
    process.env.VITE_DEV_SERVER_URL,
    "index"
  );

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(entry);
  } else {
    void window.loadFile(entry);
  }

  window.once("ready-to-show", () => window.show());
  return window;
}
```

```ts
import path from "node:path";
import { BrowserWindow } from "electron";

import { resolveRendererEntry } from "./paths";

export function createTestWorkbenchWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    title: "Yulora Test Workbench",
    webPreferences: {
      preload: path.join(__dirname, "../preload/test-workbench-preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const entry = resolveRendererEntry(
    path.join(__dirname, "../../dist"),
    process.env.VITE_DEV_SERVER_URL,
    "test-workbench"
  );

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(entry);
  } else {
    void window.loadFile(entry);
  }

  window.once("ready-to-show", () => window.show());
  return window;
}
```

- [ ] **Step 5: Extend the mode helper with the startup window decision**

```ts
import type { YuloraAppMode } from "../shared/test-workbench";

export function resolveAppMode(rawMode = process.env.YULORA_MODE): YuloraAppMode {
  return rawMode === "test-workbench" ? "test-workbench" : "editor";
}

export function getInitialWindowKind(mode: YuloraAppMode): "editor" | "test-workbench" {
  return mode === "test-workbench" ? "test-workbench" : "editor";
}
```

- [ ] **Step 6: Wire startup mode and the “open editor from workbench” IPC in `src/main/main.ts`**

```ts
import { app, BrowserWindow, ipcMain } from "electron";

import { showOpenMarkdownDialog } from "./open-markdown-file";
import { resolveAppMode } from "./app-mode";
import { createEditorWindow } from "./editor-window";
import { createTestWorkbenchWindow } from "./test-workbench-window";
import { OPEN_MARKDOWN_FILE_CHANNEL } from "../shared/open-markdown-file";
import { OPEN_EDITOR_WINDOW_CHANNEL } from "../shared/test-workbench";

function openWindowForMode() {
  const mode = resolveAppMode();
  return mode === "test-workbench" ? createTestWorkbenchWindow() : createEditorWindow();
}

app.whenReady().then(() => {
  ipcMain.handle(OPEN_MARKDOWN_FILE_CHANNEL, async () => showOpenMarkdownDialog());

  ipcMain.handle(OPEN_EDITOR_WINDOW_CHANNEL, async () => {
    createEditorWindow();
    return { status: "opened" } as const;
  });

  openWindowForMode();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openWindowForMode();
    }
  });
});
```

- [ ] **Step 7: Re-run the main-process tests**

Run: `npm test -- src/main/app-mode.test.ts src/main/paths.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/main/editor-window.ts src/main/test-workbench-window.ts src/main/main.ts src/main/app-mode.ts src/main/app-mode.test.ts
git commit -m "feat: isolate workbench window bootstrap"
```

### Task 3: Add the workbench preload bridge and static scenario shell

**Files:**
- Create: `src/preload/test-workbench-preload.ts`
- Create: `src/renderer/test-workbench-globals.d.ts`
- Create: `src/renderer/test-workbench-data.ts`
- Create: `src/renderer/test-workbench-state.ts`
- Create: `src/renderer/test-workbench-state.test.ts`
- Create: `src/renderer/TestWorkbenchApp.tsx`
- Create: `src/renderer/test-workbench-main.tsx`
- Create: `src/renderer/test-workbench.html`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Write the failing state test for the workbench shell**

```ts
import { describe, expect, it } from "vitest";

import {
  createInitialWorkbenchState,
  finishLaunchingEditor,
  startLaunchingEditor
} from "./test-workbench-state";

describe("test-workbench-state", () => {
  it("marks the editor launch request as in flight", () => {
    const nextState = startLaunchingEditor(createInitialWorkbenchState());
    expect(nextState.editorLaunchState).toBe("launching");
  });

  it("returns to idle after a successful launch", () => {
    const nextState = finishLaunchingEditor(
      { editorLaunchState: "launching", errorMessage: "old" },
      { status: "opened" }
    );

    expect(nextState).toEqual({
      editorLaunchState: "idle",
      errorMessage: null
    });
  });
});
```

- [ ] **Step 2: Run the focused renderer test to verify it fails**

Run: `npm test -- src/renderer/test-workbench-state.test.ts`
Expected: FAIL because `src/renderer/test-workbench-state.ts` does not exist yet

- [ ] **Step 3: Add the minimal bridge contract and static workbench data**

```ts
import { contextBridge, ipcRenderer } from "electron";

import { OPEN_EDITOR_WINDOW_CHANNEL } from "../shared/test-workbench";

const api = {
  platform: process.platform,
  mode: "test-workbench" as const,
  openEditorWindow: () => ipcRenderer.invoke(OPEN_EDITOR_WINDOW_CHANNEL)
};

contextBridge.exposeInMainWorld("yuloraTestWorkbench", api);
```

```ts
export {};

declare global {
  interface Window {
    yuloraTestWorkbench: {
      platform: string;
      mode: "test-workbench";
      openEditorWindow: () => Promise<{ status: "opened" }>;
    };
  }
}
```

```ts
export const testWorkbenchScenarios = [
  {
    id: "app-shell-startup",
    title: "App Shell Startup",
    description: "Verify that the desktop shell reaches a ready state.",
    tags: ["smoke", "shell"],
    supportsVisual: false,
    status: "planned" as const
  },
  {
    id: "open-edit-save-reopen-smoke",
    title: "Open / Edit / Save / Reopen",
    description: "Placeholder row for the first end-to-end smoke scenario.",
    tags: ["smoke", "editor"],
    supportsVisual: true,
    status: "planned" as const
  }
] as const;
```

- [ ] **Step 4: Add the pure state helpers**

```ts
export type EditorLaunchResult = { status: "opened" };

export type TestWorkbenchState = {
  editorLaunchState: "idle" | "launching";
  errorMessage: string | null;
};

export function createInitialWorkbenchState(): TestWorkbenchState {
  return {
    editorLaunchState: "idle",
    errorMessage: null
  };
}

export function startLaunchingEditor(current: TestWorkbenchState): TestWorkbenchState {
  return {
    ...current,
    editorLaunchState: "launching",
    errorMessage: null
  };
}

export function finishLaunchingEditor(
  current: TestWorkbenchState,
  _result: EditorLaunchResult
): TestWorkbenchState {
  return {
    ...current,
    editorLaunchState: "idle",
    errorMessage: null
  };
}
```

- [ ] **Step 5: Add the dedicated renderer entry and workbench UI without touching `App.tsx`**

```tsx
import { useState } from "react";

import { testWorkbenchScenarios } from "./test-workbench-data";
import {
  createInitialWorkbenchState,
  finishLaunchingEditor,
  startLaunchingEditor
} from "./test-workbench-state";

export default function TestWorkbenchApp() {
  const [state, setState] = useState(createInitialWorkbenchState);

  async function handleOpenEditorWindow(): Promise<void> {
    setState((current) => startLaunchingEditor(current));
    const result = await window.yuloraTestWorkbench.openEditorWindow();
    setState((current) => finishLaunchingEditor(current, result));
  }

  return (
    <main className="workbench-shell">
      <section className="workbench-hero">
        <p className="eyebrow">TASK-025</p>
        <h1>Yulora Test Workbench</h1>
        <p className="description">
          Dedicated agent-only surface for launching isolated test scenarios and opening the editor
          shell on demand.
        </p>
        <div className="workbench-actions">
          <button
            className="open-button"
            disabled={state.editorLaunchState === "launching"}
            onClick={() => void handleOpenEditorWindow()}
            type="button"
          >
            {state.editorLaunchState === "launching" ? "Opening editor..." : "Open Editor Window"}
          </button>
          <p className="meta">
            Mode: {window.yuloraTestWorkbench.mode} · Platform: {window.yuloraTestWorkbench.platform}
          </p>
        </div>
      </section>

      <section className="scenario-grid" aria-label="Scenario list">
        {testWorkbenchScenarios.map((scenario) => (
          <article key={scenario.id} className="scenario-card">
            <div className="scenario-card-header">
              <h2>{scenario.title}</h2>
              <span className="scenario-status">{scenario.status}</span>
            </div>
            <p>{scenario.description}</p>
            <p className="meta">{scenario.id}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
```

```tsx
import React from "react";
import ReactDOM from "react-dom/client";

import TestWorkbenchApp from "./TestWorkbenchApp";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TestWorkbenchApp />
  </React.StrictMode>
);
```

- [ ] **Step 6: Add the workbench-specific styles and HTML entry**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Yulora Test Workbench</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./test-workbench-main.tsx"></script>
  </body>
</html>
```

```css
.workbench-shell {
  min-height: 100vh;
  padding: 32px;
  display: grid;
  gap: 24px;
}

.workbench-hero,
.scenario-card {
  border: 1px solid rgba(232, 236, 243, 0.12);
  border-radius: 24px;
  background: rgba(11, 16, 23, 0.82);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
}

.workbench-hero {
  padding: 32px;
}

.scenario-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.scenario-card {
  padding: 24px;
}

.scenario-card-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
}

.scenario-status {
  color: #8db4ff;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
}
```

- [ ] **Step 7: Re-run the focused renderer test**

Run: `npm test -- src/renderer/test-workbench-state.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/preload/test-workbench-preload.ts src/renderer/test-workbench-globals.d.ts src/renderer/test-workbench-data.ts src/renderer/test-workbench-state.ts src/renderer/test-workbench-state.test.ts src/renderer/TestWorkbenchApp.tsx src/renderer/test-workbench-main.tsx src/renderer/test-workbench.html src/renderer/styles.css
git commit -m "feat: add isolated test workbench shell"
```

### Task 4: Document the entry points and run full verification

**Files:**
- Modify: `tests/e2e/README.md`

- [ ] **Step 1: Re-read the shared test docs before editing**

Run: `git diff -- tests/e2e/README.md`
Expected: Confirm no other task has already started documenting the same entry point

- [ ] **Step 2: Add the developer-facing startup notes**

```md
## 测试工作台入口

- 默认开发壳：`npm run dev`
- 独立测试工作台：`npm run dev:test-workbench`
- 底层模式开关：`YULORA_MODE=test-workbench`

测试工作台窗口与主编辑器窗口隔离；测试模式下默认只启动工作台，主编辑器需要从工作台界面主动拉起。
```

- [ ] **Step 3: Run full verification**

Run:
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- All commands PASS

- [ ] **Step 4: Smoke-check the new entry**

Run: `npm run dev:test-workbench`
Expected: The app opens the test workbench window first, the editor window stays closed until the workbench button is pressed, and closing the workbench does not mutate the editor renderer path

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/README.md
git commit -m "docs: record test workbench entry points"
```
