# TASK-012 List And Task List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inactive rendering plus predictable Enter semantics for unordered lists, ordered lists, and task lists, and cover the behavior with both unit tests and a runnable scenario.

**Architecture:** Extend `packages/markdown-engine` so top-level `list` blocks expose item-level metadata, keep rendering inside the existing `CodeMirror` decoration pipeline in `src/renderer/code-editor.ts`, and add the smallest possible editor test commands so the shared test harness can drive cursor placement and `Enter`. Do not introduce a second renderer or any non-Markdown document model.

**Tech Stack:** TypeScript, CodeMirror 6, React, Vitest, Electron test harness

---

### Task 1: Extend list block metadata in the markdown engine

**Files:**
- Modify: `packages/markdown-engine/src/block-map.ts`
- Modify: `packages/markdown-engine/src/parse-block-map.ts`
- Modify: `packages/markdown-engine/src/parse-block-map.test.ts`
- Modify: `packages/markdown-engine/src/index.ts`

- [ ] **Step 1: Write the failing parser test**

```ts
it("captures list item metadata for unordered, ordered, and task items", () => {
  const source = ["- one", "- [x] done", "1. first", "2. second"].join("\n");

  expect(parseBlockMap(source).blocks).toEqual([
    {
      id: "list:0-34",
      type: "list",
      ordered: false,
      startOffset: 0,
      endOffset: 34,
      startLine: 1,
      endLine: 4,
      items: [
        expect.objectContaining({
          marker: "-",
          indent: 0,
          task: null
        }),
        expect.objectContaining({
          marker: "-",
          task: expect.objectContaining({ checked: true })
        }),
        expect.objectContaining({
          marker: "1.",
          task: null
        })
      ]
    }
  ]);
});
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts`
Expected: FAIL because `ListBlock` does not expose `items`

- [ ] **Step 3: Add the minimal list item types**

```ts
export interface ListItemBlock {
  id: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  indent: number;
  marker: string;
  markerStart: number;
  markerEnd: number;
  task:
    | null
    | {
        checked: boolean;
        markerStart: number;
        markerEnd: number;
      };
}

export interface ListBlock extends BaseBlock {
  type: "list";
  ordered: boolean;
  items: readonly ListItemBlock[];
}
```

- [ ] **Step 4: Implement the smallest parser support**

```ts
function createListBlock(token: Token, ordered: boolean, source: string): ListBlock {
  const base = createBaseBlock("list", token);

  return {
    ...base,
    ordered,
    items: parseListItems(source.slice(base.startOffset, base.endOffset), base.startOffset, base.startLine)
  };
}
```

```ts
function parseListItems(sourceSlice: string, baseOffset: number, baseLine: number): ListItemBlock[] {
  return sourceSlice
    .split("\n")
    .map((line, index) => createListItemBlock(line, index, baseOffset, baseLine))
    .filter((item): item is ListItemBlock => item !== null);
}
```

- [ ] **Step 5: Add the nested-list regression**

```ts
it("tracks nested item indentation for list enter/exit behavior", () => {
  const source = ["- parent", "  - child", "  - [ ] todo"].join("\n");
  const list = parseBlockMap(source).blocks[0];

  expect(list?.type).toBe("list");
  if (list?.type === "list") {
    expect(list.items.map((item) => item.indent)).toEqual([0, 2, 2]);
    expect(list.items[2]?.task?.checked).toBe(false);
  }
});
```

- [ ] **Step 6: Run the parser test to verify it passes**

Run: `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/markdown-engine/src/block-map.ts packages/markdown-engine/src/parse-block-map.ts packages/markdown-engine/src/parse-block-map.test.ts packages/markdown-engine/src/index.ts
git commit -m "feat: add list item metadata to block map"
```

### Task 2: Add failing renderer tests for inactive list rendering

**Files:**
- Modify: `src/renderer/code-editor.test.ts`
- Modify: `src/renderer/code-editor.ts`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Write the failing inactive list test**

```ts
it("applies inactive list decorations when another block becomes active", () => {
  const host = document.createElement("div");
  const source = ["- one", "- [ ] todo", "", "Paragraph"].join("\n");

  const controller = createCodeEditorController({
    parent: host,
    initialContent: source,
    onChange: vi.fn()
  });

  const view = getEditorView(host);
  view?.dispatch({ selection: { anchor: source.indexOf("Paragraph") } });

  expect(getLineElementByText(host, "- one")?.classList.contains("cm-inactive-list")).toBe(true);
  expect(host.querySelector(".cm-inactive-list-marker")).not.toBeNull();
  expect(host.querySelector(".cm-inactive-task-marker")).not.toBeNull();

  controller.destroy();
});
```

- [ ] **Step 2: Run the renderer test to verify it fails**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: FAIL because list decorations do not exist yet

- [ ] **Step 3: Extend the shared decoration helper**

```ts
if (block.type === "list") {
  signatures.push(`${block.type}:${block.id}:${block.items.length}`);

  for (const item of block.items) {
    ranges.push(
      Decoration.line({
        attributes: {
          class: `cm-inactive-list cm-inactive-list-${block.ordered ? "ordered" : "unordered"} cm-inactive-list-depth-${Math.floor(item.indent / 2)}`
        }
      }).range(item.startOffset)
    );

    ranges.push(
      Decoration.mark({
        attributes: { class: "cm-inactive-list-marker" }
      }).range(item.markerStart, item.markerEnd)
    );
  }
}
```

- [ ] **Step 4: Add the minimal task-marker styling**

```css
.document-editor .cm-inactive-list {
  color: #344054;
}

.document-editor .cm-inactive-list-marker {
  color: #98a2b3;
}

.document-editor .cm-inactive-task-marker {
  color: #667085;
}
```

- [ ] **Step 5: Add the ordered/task regression test**

```ts
it("styles ordered markers and checked task markers distinctly", () => {
  const host = document.createElement("div");
  const source = ["1. first", "2. [x] done", "", "Paragraph"].join("\n");

  const controller = createCodeEditorController({
    parent: host,
    initialContent: source,
    onChange: vi.fn()
  });

  const view = getEditorView(host);
  view?.dispatch({ selection: { anchor: source.indexOf("Paragraph") } });

  expect(host.querySelector(".cm-inactive-list-ordered")).not.toBeNull();
  expect(host.querySelector(".cm-inactive-task-marker-checked")).not.toBeNull();

  controller.destroy();
});
```

- [ ] **Step 6: Run the renderer test to verify it passes**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: PASS for new list rendering tests and existing heading/paragraph tests

- [ ] **Step 7: Commit**

```bash
git add src/renderer/code-editor.ts src/renderer/code-editor.test.ts src/renderer/styles.css
git commit -m "feat: add inactive list rendering"
```

### Task 3: Add failing Enter-behavior tests and implement the minimal keymap

**Files:**
- Modify: `src/renderer/code-editor.test.ts`
- Modify: `src/renderer/code-editor.ts`

- [ ] **Step 1: Write the failing continuation test**

```ts
it("continues a non-empty task list item on Enter", () => {
  const host = document.createElement("div");
  const source = "- [ ] todo";

  const controller = createCodeEditorController({
    parent: host,
    initialContent: source,
    onChange: vi.fn()
  });

  controller.setSelection(source.length);
  controller.pressEnter();

  expect(controller.getContent()).toBe("- [ ] todo\n- [ ] ");
  controller.destroy();
});
```

- [ ] **Step 2: Write the failing exit test**

```ts
it("exits an empty nested list item on Enter", () => {
  const host = document.createElement("div");
  const source = ["- parent", "  - "].join("\n");

  const controller = createCodeEditorController({
    parent: host,
    initialContent: source,
    onChange: vi.fn()
  });

  controller.setSelection(source.length);
  controller.pressEnter();

  expect(controller.getContent()).toBe(["- parent", ""].join("\n"));
  controller.destroy();
});
```

- [ ] **Step 3: Run the renderer test to verify it fails**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: FAIL because the controller cannot set selection / press Enter yet

- [ ] **Step 4: Add the smallest controller helpers**

```ts
export type CodeEditorController = {
  getContent: () => string;
  replaceDocument: (nextContent: string) => void;
  insertText: (text: string) => void;
  setSelection: (anchor: number, head?: number) => void;
  pressEnter: () => void;
  destroy: () => void;
};
```

- [ ] **Step 5: Implement the Enter command**

```ts
const handleListEnter = (): boolean => {
  const command = computeListEnterTransaction(view.state);
  if (!command) {
    return false;
  }

  view.dispatch(command);
  return true;
};
```

```ts
keymap.of([
  {
    key: "Enter",
    run: () => handleListEnter() || insertNewlineAndIndent(view)
  },
  ...historyKeymap,
  ...defaultKeymap
])
```

- [ ] **Step 6: Add the ordered-list regression**

```ts
it("increments ordered list markers on Enter", () => {
  const host = document.createElement("div");
  const source = "2. next";

  const controller = createCodeEditorController({
    parent: host,
    initialContent: source,
    onChange: vi.fn()
  });

  controller.setSelection(source.length);
  controller.pressEnter();

  expect(controller.getContent()).toBe("2. next\n3. ");
  controller.destroy();
});
```

- [ ] **Step 7: Run the renderer test to verify it passes**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: PASS for continuation, ordered increment, and empty-item exit

- [ ] **Step 8: Commit**

```bash
git add src/renderer/code-editor.ts src/renderer/code-editor.test.ts
git commit -m "feat: add list enter behavior"
```

### Task 4: Extend editor test commands for selection and Enter

**Files:**
- Modify: `src/shared/editor-test-command.ts`
- Modify: `src/renderer/editor-test-driver.ts`
- Modify: `src/renderer/app.autosave.test.ts`
- Modify: `packages/test-harness/src/handlers/electron-ipc.ts`

- [ ] **Step 1: Write the failing editor-driver test**

```ts
it("can set selection and press Enter through the driver", async () => {
  const setSelection = vi.fn();
  const pressEnter = vi.fn();

  const driver = createEditorTestDriver({
    getState: () => ({ currentDocument: { path: "x", name: "x", content: "- [ ] todo", encoding: "utf-8" }, isDirty: false } as never),
    applyState: vi.fn(),
    resetAutosaveRuntime: vi.fn(),
    editor: {
      getContent: () => "- [ ] todo\n- [ ] ",
      setContent: vi.fn(),
      insertText: vi.fn(),
      setSelection,
      pressEnter
    },
    setEditorContentSnapshot: vi.fn(),
    openMarkdownFileFromPath: vi.fn(),
    saveMarkdownFile: vi.fn()
  });

  await driver.run({ type: "set-editor-selection", anchor: 10 });
  await driver.run({ type: "press-editor-enter" });

  expect(setSelection).toHaveBeenCalledWith(10, 10);
  expect(pressEnter).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the driver test to verify it fails**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL because the new command types do not exist

- [ ] **Step 3: Add the new shared command types**

```ts
| { type: "set-editor-selection"; anchor: number; head?: number }
| { type: "press-editor-enter" }
```

- [ ] **Step 4: Extend the editor driver**

```ts
if (command.type === "set-editor-selection") {
  input.editor.setSelection(command.anchor, command.head ?? command.anchor);
  return ok("Editor selection updated.");
}

if (command.type === "press-editor-enter") {
  input.editor.pressEnter();
  const nextContent = input.editor.getContent();
  input.setEditorContentSnapshot(nextContent);
  input.applyState((current) => applyEditorContentChanged(current, nextContent));
  return ok("Editor Enter executed.");
}
```

- [ ] **Step 5: Mirror the new commands into the harness IPC type**

```ts
| { type: "set-editor-selection"; anchor: number; head?: number }
| { type: "press-editor-enter" }
```

- [ ] **Step 6: Run the driver test to verify it passes**

Run: `npm run test -- src/renderer/app.autosave.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/editor-test-command.ts src/renderer/editor-test-driver.ts src/renderer/app.autosave.test.ts packages/test-harness/src/handlers/electron-ipc.ts
git commit -m "feat: add editor selection and enter test commands"
```

### Task 5: Add a runnable list-enter scenario and its handler mapping

**Files:**
- Create: `packages/test-harness/src/scenarios/list-enter-behavior-basic.ts`
- Modify: `packages/test-harness/src/scenarios/index.ts`
- Modify: `packages/test-harness/src/handlers/electron.ts`
- Modify: `packages/test-harness/src/handlers/electron.test.ts`
- Modify: `packages/test-harness/src/registry.test.ts`
- Create: `fixtures/test-harness/list-enter-behavior-basic.md`

- [ ] **Step 1: Write the failing handler test**

```ts
it("maps the list-enter scenario to selection, enter, and content assertions", async () => {
  const runCommand = vi.fn().mockResolvedValue({ ok: true });
  const handlers = createElectronStepHandlers({
    scenario: listEnterBehaviorBasicScenario,
    cwd: "D:/MyAgent/Yulora/Yulora",
    runCommand,
    readTextFile: vi.fn().mockResolvedValue("- [ ] todo\n")
  });

  await handlers["place-cursor-at-task-end"]?.({
    scenarioId: listEnterBehaviorBasicScenario.id,
    step: listEnterBehaviorBasicScenario.steps[2]!,
    signal: new AbortController().signal
  });

  await handlers["press-enter-to-continue-task"]?.({
    scenarioId: listEnterBehaviorBasicScenario.id,
    step: listEnterBehaviorBasicScenario.steps[3]!,
    signal: new AbortController().signal
  });

  expect(runCommand.mock.calls.map(([command]) => command)).toEqual([
    { type: "set-editor-selection", anchor: 10, head: 10 },
    { type: "press-editor-enter" }
  ]);
});
```

- [ ] **Step 2: Run the handler test to verify it fails**

Run: `npm run test -- packages/test-harness/src/handlers/electron.test.ts`
Expected: FAIL because the scenario and mapping do not exist yet

- [ ] **Step 3: Add the scenario metadata**

```ts
export const listEnterBehaviorBasicScenario: TestScenario = {
  id: "list-enter-behavior-basic",
  title: "Continue and exit task list items with Enter",
  summary: "Opens a list fixture, continues a task item, then exits an empty task item.",
  surface: "editor",
  tags: ["editor", "rendering", "smoke"],
  steps: [
    { id: "launch-dev-shell", title: "Launch the editor shell", kind: "setup" },
    { id: "open-list-fixture", title: "Open the list fixture", kind: "action" },
    { id: "place-cursor-at-task-end", title: "Move the cursor to the task item end", kind: "action" },
    { id: "press-enter-to-continue-task", title: "Press Enter to continue the task list", kind: "action" },
    { id: "assert-task-continued", title: "Assert a new task item was created", kind: "assertion" }
  ]
};
```

- [ ] **Step 4: Add the smallest handler mapping**

```ts
if (input.scenario.id === "list-enter-behavior-basic") {
  const fixturePath = resolve(input.cwd, "fixtures/test-harness/list-enter-behavior-basic.md");

  return {
    "launch-dev-shell": ({ signal }) => runCheckedCommand({ type: "wait-for-editor-ready" }, signal),
    "open-list-fixture": ({ signal }) => runCheckedCommand({ type: "open-fixture-file", fixturePath }, signal),
    "place-cursor-at-task-end": ({ signal }) =>
      runCheckedCommand({ type: "set-editor-selection", anchor: 10, head: 10 }, signal),
    "press-enter-to-continue-task": ({ signal }) =>
      runCheckedCommand({ type: "press-editor-enter" }, signal),
    "assert-task-continued": ({ signal }) =>
      runCheckedCommand({ type: "assert-editor-content", expectedContent: "- [ ] todo\n- [ ] " }, signal)
  };
}
```

- [ ] **Step 5: Register the scenario and add the fixture**

```md
- [ ] todo
```

```ts
export const seedScenarios: readonly TestScenario[] = [
  appShellStartupScenario,
  openMarkdownFileBasicScenario,
  listEnterBehaviorBasicScenario
];
```

- [ ] **Step 6: Run the handler and registry tests to verify they pass**

Run: `npm run test -- packages/test-harness/src/handlers/electron.test.ts packages/test-harness/src/registry.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/test-harness/src/scenarios/list-enter-behavior-basic.ts packages/test-harness/src/scenarios/index.ts packages/test-harness/src/handlers/electron.ts packages/test-harness/src/handlers/electron.test.ts packages/test-harness/src/registry.test.ts fixtures/test-harness/list-enter-behavior-basic.md
git commit -m "test: add list enter behavior scenario"
```

### Task 6: Run full verification and update task records

**Files:**
- Modify: `docs/decision-log.md`
- Modify: `docs/test-report.md`
- Modify: `docs/progress.md`
- Modify: `MVP_BACKLOG.md`
- Create: `reports/task-summaries/TASK-012.md`

- [ ] **Step 1: Record the architectural decision**

```md
- `TASK-012` keeps list rendering inside the shared CodeMirror decoration pipeline.
- List item metadata is stored as parser-derived block metadata, not a second document model.
- Scenario automation extends the editor command surface only with selection and Enter primitives.
```

- [ ] **Step 2: Record the verification evidence**

```md
| 2026-04-15 | TASK-012 | `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts` | PASS | list item metadata covered |
| 2026-04-15 | TASK-012 | `npm run test -- src/renderer/code-editor.test.ts` | PASS | list rendering and Enter behavior |
| 2026-04-15 | TASK-012 | `npm run test -- packages/test-harness/src/handlers/electron.test.ts packages/test-harness/src/registry.test.ts` | PASS | scenario mapping and registry |
```

- [ ] **Step 3: Update backlog and progress**

```md
- Mark every TASK-012 execution slice complete in `MVP_BACKLOG.md`
- Move `TASK-012` from `TODO` to `DONE` in `docs/progress.md` once verification is green
```

- [ ] **Step 4: Write the task summary**

```md
# TASK-012

- Added list item metadata, inactive list rendering, and Enter continuation / exit behavior.
- Added a runnable list-enter scenario in `packages/test-harness`.
- Verified parser, renderer, harness, lint, typecheck, full test, and build gates.
```

- [ ] **Step 5: Run the full gate commands**

Run: `npm run lint`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

Run: `npm run test`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add docs/decision-log.md docs/test-report.md docs/progress.md MVP_BACKLOG.md reports/task-summaries/TASK-012.md
git commit -m "docs: record task-012 completion"
```
