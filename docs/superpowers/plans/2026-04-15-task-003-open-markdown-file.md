# TASK-003 Open Markdown File Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe open-Markdown flow that loads a UTF-8 `.md` file into renderer state and shows it in a temporary textarea-based editor surface.

**Architecture:** Keep all file-system access inside `src/main/`, expose a single `openMarkdownFile()` bridge from `src/preload/`, and let `src/renderer/` own the current-document UI state. Use pure helper modules for result mapping and renderer state transitions so the behavior can be tested without introducing a browser-only test stack.

**Tech Stack:** Electron, React, TypeScript, Vitest

---

### Task 1: Add main-process open-file result mapping

**Files:**
- Create: `src/shared/open-markdown-file.ts`
- Create: `src/main/open-markdown-file.ts`
- Test: `src/main/open-markdown-file.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

import { openMarkdownFileFromPath } from "./open-markdown-file";

describe("openMarkdownFileFromPath", () => {
  it("returns a success result for a UTF-8 markdown file", async () => {
    const result = await openMarkdownFileFromPath("C:/notes/today.md", {
      readFile: vi.fn().mockResolvedValue(Buffer.from("# Today\n", "utf8")),
      stat: vi.fn().mockResolvedValue({ isFile: () => true })
    });

    expect(result).toEqual({
      status: "success",
      document: {
        path: "C:/notes/today.md",
        name: "today.md",
        content: "# Today\n",
        encoding: "utf-8"
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/main/open-markdown-file.test.ts`
Expected: FAIL because `./open-markdown-file` does not exist yet

- [ ] **Step 3: Write the minimal shared types**

```ts
export type OpenMarkdownFileErrorCode =
  | "dialog-failed"
  | "file-not-found"
  | "not-a-file"
  | "read-failed"
  | "non-utf8";

export type OpenMarkdownDocument = {
  path: string;
  name: string;
  content: string;
  encoding: "utf-8";
};

export type OpenMarkdownFileResult =
  | { status: "success"; document: OpenMarkdownDocument }
  | { status: "cancelled" }
  | {
      status: "error";
      error: {
        code: OpenMarkdownFileErrorCode;
        message: string;
      };
    };
```

- [ ] **Step 4: Write the minimal implementation**

```ts
export async function openMarkdownFileFromPath(
  targetPath: string,
  dependencies: OpenMarkdownFileDependencies = defaultDependencies
): Promise<OpenMarkdownFileResult> {
  const fileStat = await dependencies.stat(targetPath);

  if (!fileStat.isFile()) {
    return createErrorResult("not-a-file");
  }

  const fileBuffer = await dependencies.readFile(targetPath);
  const decoded = decodeUtf8(fileBuffer);

  if (decoded === null) {
    return createErrorResult("non-utf8");
  }

  return {
    status: "success",
    document: {
      path: targetPath,
      name: path.basename(targetPath),
      content: decoded,
      encoding: "utf-8"
    }
  };
}
```

- [ ] **Step 5: Expand the tests for error mapping**

```ts
it("returns file-not-found when the selected path does not exist", async () => {
  const result = await openMarkdownFileFromPath("C:/missing.md", {
    readFile: vi.fn(),
    stat: vi.fn().mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }))
  });

  expect(result).toEqual({
    status: "error",
    error: {
      code: "file-not-found",
      message: "Selected file could not be found."
    }
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/main/open-markdown-file.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/open-markdown-file.ts src/main/open-markdown-file.ts src/main/open-markdown-file.test.ts
git commit -m "feat: add markdown file open result mapping"
```

### Task 2: Wire the Electron bridge

**Files:**
- Modify: `src/main/main.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.d.ts`
- Test: `src/main/open-markdown-file.test.ts`

- [ ] **Step 1: Write the failing bridge expectation**

```ts
it("returns a cancelled result when the user closes the picker", async () => {
  const result = await showOpenMarkdownDialog({
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] })
  });

  expect(result).toEqual({ status: "cancelled" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/main/open-markdown-file.test.ts`
Expected: FAIL because `showOpenMarkdownDialog` is not implemented yet

- [ ] **Step 3: Add the main-process dialog handler**

```ts
ipcMain.handle("yulora:open-markdown-file", async () => {
  return showOpenMarkdownDialog();
});
```

- [ ] **Step 4: Add the preload bridge and renderer type**

```ts
const api = {
  platform: process.platform,
  openMarkdownFile: () => ipcRenderer.invoke("yulora:open-markdown-file")
};
```

```ts
interface Window {
  yulora: {
    platform: NodeJS.Platform;
    openMarkdownFile: () => Promise<OpenMarkdownFileResult>;
  };
}
```

- [ ] **Step 5: Extend the test for dialog failure mapping**

```ts
it("returns dialog-failed when the file picker throws", async () => {
  const result = await showOpenMarkdownDialog({
    showOpenDialog: vi.fn().mockRejectedValue(new Error("picker failed"))
  });

  expect(result).toEqual({
    status: "error",
    error: {
      code: "dialog-failed",
      message: "The file picker could not be opened."
    }
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/main/open-markdown-file.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/main/main.ts src/preload/preload.ts src/renderer/types.d.ts src/main/open-markdown-file.test.ts
git commit -m "feat: expose markdown file open bridge"
```

### Task 3: Add renderer document state and UI

**Files:**
- Create: `src/renderer/document-state.ts`
- Create: `src/renderer/document-state.test.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Write the failing state test**

```ts
import { describe, expect, it } from "vitest";

import { applyOpenMarkdownResult, createInitialAppState } from "./document-state";

describe("applyOpenMarkdownResult", () => {
  it("loads the returned document and clears the previous error", () => {
    const nextState = applyOpenMarkdownResult(createInitialAppState(), {
      status: "success",
      document: {
        path: "C:/notes/today.md",
        name: "today.md",
        content: "# Today\n",
        encoding: "utf-8"
      }
    });

    expect(nextState.currentDocument?.name).toBe("today.md");
    expect(nextState.errorMessage).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/renderer/document-state.test.ts`
Expected: FAIL because `./document-state` does not exist yet

- [ ] **Step 3: Write the minimal state helpers**

```ts
export function createInitialAppState(): AppState {
  return {
    currentDocument: null,
    openState: "idle",
    errorMessage: null
  };
}

export function applyOpenMarkdownResult(
  currentState: AppState,
  result: OpenMarkdownFileResult
): AppState {
  if (result.status === "success") {
    return {
      currentDocument: result.document,
      openState: "idle",
      errorMessage: null
    };
  }

  if (result.status === "cancelled") {
    return {
      ...currentState,
      openState: "idle",
      errorMessage: null
    };
  }

  return {
    ...currentState,
    openState: "idle",
    errorMessage: result.error.message
  };
}
```

- [ ] **Step 4: Add the App UI and textarea editing**

```tsx
const [state, setState] = useState(createInitialAppState());

async function handleOpenMarkdown(): Promise<void> {
  setState((current) => ({ ...current, openState: "opening" }));
  const result = await window.yulora.openMarkdownFile();
  setState((current) => applyOpenMarkdownResult(current, result));
}
```

```tsx
{state.currentDocument ? (
  <textarea
    value={state.currentDocument.content}
    onChange={(event) => {
      const nextContent = event.target.value;
      setState((current) =>
        current.currentDocument
          ? {
              ...current,
              currentDocument: {
                ...current.currentDocument,
                content: nextContent
              }
            }
          : current
      );
    }}
  />
) : null}
```

- [ ] **Step 5: Expand the renderer tests**

```ts
it("keeps the current document on cancelled results", () => {
  const initialState = {
    currentDocument: {
      path: "C:/notes/existing.md",
      name: "existing.md",
      content: "draft",
      encoding: "utf-8"
    },
    openState: "opening",
    errorMessage: "old error"
  } satisfies AppState;

  const nextState = applyOpenMarkdownResult(initialState, { status: "cancelled" });

  expect(nextState.currentDocument?.name).toBe("existing.md");
  expect(nextState.errorMessage).toBeNull();
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/renderer/document-state.test.ts`
Expected: PASS

- [ ] **Step 7: Run project verification**

Run:
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- All commands PASS

- [ ] **Step 8: Commit**

```bash
git add src/renderer/document-state.ts src/renderer/document-state.test.ts src/renderer/App.tsx src/renderer/styles.css
git commit -m "feat: show opened markdown documents in renderer"
```
