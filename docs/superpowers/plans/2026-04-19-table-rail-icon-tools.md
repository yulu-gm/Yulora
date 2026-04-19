# Table Rail Icon Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把表格编辑模式下的 rail tools 从纵向文字按钮改成 rail 内图标按钮，并补上 hover/focus tooltip，同时保持表格命令与编辑上下文切换行为不变。

**Architecture:** 继续由 `src/renderer/editor/App.tsx` 持有表格工具命令和 rail 模式切换，但把散落的按钮 JSX 收敛成结构化 action 配置与内置 SVG icon 渲染。样式集中落在 `src/renderer/styles/app-ui.css`，主题继续只通过 `styles/ui.css` 覆盖壳层外观；测试先在 `src/renderer/app.autosave.test.ts` 里锁定图标化结构、tooltip 状态和 CSS 约束，再用最小实现让回归通过。

**Tech Stack:** React, TypeScript, Vitest, CSS, Electron renderer shell

---

### Task 1: 用测试锁定表格 rail 的新结构与 tooltip 交互

**Files:**
- Modify: `src/renderer/app.autosave.test.ts`

- [ ] **Step 1: 写一个失败的 rail 结构测试**

```ts
it("renders table rail tools as icon buttons with accessible labels", async () => {
  await renderAndOpenDocument();

  await act(async () => {
    codeEditorMock.emitActiveBlockChange({
      activeBlock: { id: "table:0-1", type: "table" },
      blockMap: { blocks: [] },
      selection: { anchor: 0, head: 0 },
      tableCursor: {
        mode: "inside",
        tableStartOffset: 0,
        row: 0,
        column: 0,
        offsetInCell: 0
      }
    });
    await Promise.resolve();
  });

  const toolStrip = container.querySelector<HTMLElement>('[data-yulora-region="table-tool-strip"]');
  const toolButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[data-yulora-region="table-tool-button"]')
  );

  expect(toolStrip).not.toBeNull();
  expect(toolButtons).toHaveLength(7);
  expect(toolButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
    "Row Above",
    "Row Below",
    "Column Left",
    "Column Right",
    "Delete Row",
    "Delete Column",
    "Delete Table"
  ]);
  expect(toolStrip?.textContent).not.toContain("Row Above");
});
```

- [ ] **Step 2: 运行单测，确认它先失败**

Run: `npm.cmd run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL，因为当前 DOM 里还没有 `data-yulora-region="table-tool-button"`，而且 `table-tool-strip` 仍直接渲染文字按钮。

- [ ] **Step 3: 再写一个失败的 tooltip 交互测试**

```ts
it("shows a table tool tooltip on hover and hides it on pointer leave", async () => {
  await renderAndOpenDocument();

  await act(async () => {
    codeEditorMock.emitActiveBlockChange({
      activeBlock: { id: "table:0-1", type: "table" },
      blockMap: { blocks: [] },
      selection: { anchor: 0, head: 0 },
      tableCursor: {
        mode: "inside",
        tableStartOffset: 0,
        row: 0,
        column: 0,
        offsetInCell: 0
      }
    });
    await Promise.resolve();
  });

  const rowAboveButton = container.querySelector<HTMLButtonElement>(
    '[data-yulora-region="table-tool-button"][aria-label="Row Above"]'
  );

  expect(container.querySelector('[data-yulora-region="table-tool-tooltip"]')).toBeNull();

  await act(async () => {
    rowAboveButton?.dispatchEvent(new MouseEvent("pointerenter", { bubbles: true }));
    await Promise.resolve();
  });

  expect(container.querySelector('[data-yulora-region="table-tool-tooltip"]')?.textContent).toContain(
    "Row Above"
  );

  await act(async () => {
    rowAboveButton?.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }));
    await Promise.resolve();
  });

  expect(container.querySelector('[data-yulora-region="table-tool-tooltip"]')).toBeNull();
});
```

- [ ] **Step 4: 再次运行单测，确认 tooltip 场景同样失败**

Run: `npm.cmd run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL，因为当前实现里没有 tooltip 容器，也没有 hover 状态。

- [ ] **Step 5: 写样式规则断言，锁定 rail icon button 与 tooltip 的 CSS 钩子**

```ts
it("defines compact icon rail tool styles and tooltip positioning", () => {
  const stripRule = getCssRule(appUiStylesheet, ".table-tool-strip");
  const buttonRule = getCssRule(appUiStylesheet, ".table-tool-button");
  const tooltipRule = getCssRule(appUiStylesheet, ".table-tool-tooltip");
  const dangerRule = getCssRule(appUiStylesheet, '.table-tool-button[data-tone="danger"]');

  expect(stripRule).toContain("justify-items: center;");
  expect(buttonRule).toContain("inline-size: 44px;");
  expect(buttonRule).toContain("block-size: 44px;");
  expect(tooltipRule).toContain("left: calc(100% + 10px);");
  expect(dangerRule).toContain("color:");
});
```

- [ ] **Step 6: 运行单测，确认 CSS 断言也先失败**

Run: `npm.cmd run test -- src/renderer/app.autosave.test.ts`
Expected: FAIL，因为 `app-ui.css` 还没有新的 icon button / tooltip 规则。

### Task 2: 在 renderer 中实现 icon buttons、内置 SVG 与 tooltip

**Files:**
- Modify: `src/renderer/editor/App.tsx`

- [ ] **Step 1: 增加表格工具 action 配置与 icon 渲染函数**

```tsx
type TableToolTone = "default" | "danger";

type TableToolAction = {
  id: string;
  label: string;
  tone: TableToolTone;
  onClick: () => void;
  renderIcon: () => JSX.Element;
};

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
```

- [ ] **Step 2: 添加受控 tooltip 状态，并把 hover/focus 绑定到单个按钮**

```tsx
const [activeTableToolId, setActiveTableToolId] = useState<string | null>(null);

const tableToolActions: TableToolAction[] = [
  {
    id: "row-above",
    label: "Row Above",
    tone: "default",
    onClick: insertTableRowAbove,
    renderIcon: () => <RowAboveIcon className="table-tool-button-icon" />
  }
];

const activeTableTool = tableToolActions.find((action) => action.id === activeTableToolId) ?? null;
```

- [ ] **Step 3: 把原先的 7 个文字按钮替换成 map 渲染**

```tsx
<div className="table-tool-strip" data-yulora-region="table-tool-strip">
  {tableToolActions.map((action) => (
    <button
      key={action.id}
      type="button"
      className="table-tool-button"
      data-tone={action.tone}
      data-yulora-region="table-tool-button"
      aria-label={action.label}
      onClick={action.onClick}
      onPointerEnter={() => setActiveTableToolId(action.id)}
      onPointerLeave={() => setActiveTableToolId((current) => (current === action.id ? null : current))}
      onFocus={() => setActiveTableToolId(action.id)}
      onBlur={() => setActiveTableToolId((current) => (current === action.id ? null : current))}
    >
      {action.renderIcon()}
    </button>
  ))}
  {activeTableTool ? (
    <div className="table-tool-tooltip" data-yulora-region="table-tool-tooltip" role="status">
      {activeTableTool.label}
    </div>
  ) : null}
</div>
```

- [ ] **Step 4: 处理模式切换时的 tooltip 回退，避免离开表格模式后残留**

```tsx
useEffect(() => {
  if (activeShortcutGroup.id !== "table-editing") {
    setActiveTableToolId(null);
  }
}, [activeShortcutGroup.id]);
```

- [ ] **Step 5: 运行 renderer 测试，确认逻辑层从红到绿**

Run: `npm.cmd run test -- src/renderer/app.autosave.test.ts`
Expected: 前面新增的结构测试和 tooltip 测试 PASS；如果 CSS 断言仍失败，保留到 Task 3 统一变绿。

### Task 3: 实现 rail icon tool 样式并完成验证

**Files:**
- Modify: `src/renderer/styles/app-ui.css`
- Modify: `src/renderer/app.autosave.test.ts`
- Docs: `reports/task-summaries/TASK-042.md`

- [ ] **Step 1: 重写 table tool strip 为 rail 内 icon stack**

```css
.table-tool-strip {
  position: relative;
  width: 100%;
  display: grid;
  justify-items: center;
  gap: 8px;
  align-content: start;
}

.table-tool-button {
  inline-size: 44px;
  block-size: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
```

- [ ] **Step 2: 添加图标、危险态与 tooltip 样式**

```css
.table-tool-button-icon {
  inline-size: 18px;
  block-size: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.table-tool-button[data-tone="danger"] {
  color: var(--yulora-text-strong);
}

.table-tool-tooltip {
  position: absolute;
  top: 0;
  left: calc(100% + 10px);
  padding: 8px 10px;
  border: 1px solid var(--yulora-border-faint);
  border-radius: 12px;
  background: var(--yulora-surface-panel-bg);
  white-space: nowrap;
  pointer-events: none;
}
```

- [ ] **Step 3: 再跑单测，确认结构、tooltip、CSS 约束一起变绿**

Run: `npm.cmd run test -- src/renderer/app.autosave.test.ts`
Expected: PASS

- [ ] **Step 4: 运行针对 renderer 的补充门禁**

Run: `npm.cmd run test -- src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`
Expected: PASS，且无新增表格编辑上下文回归。

- [ ] **Step 5: 运行仓库要求的完成门禁**

Run: `npm.cmd run lint`
Expected: PASS

Run: `npm.cmd run typecheck`
Expected: PASS

Run: `npm.cmd run build`
Expected: PASS

- [ ] **Step 6: 写任务总结**

```md
# TASK-042

- 将表格 rail tools 改为 app 内置 SVG 图标按钮。
- 为 hover / focus 增加 tooltip，并保持 rail 模式切换与表格命令不变。
- 更新 renderer 测试与样式断言，覆盖 icon rail 与 tooltip 回归。
```

- [ ] **Step 7: 提交实现**

```bash
git add src/renderer/editor/App.tsx src/renderer/styles/app-ui.css src/renderer/app.autosave.test.ts reports/task-summaries/TASK-042.md
git commit -m "feat(renderer): convert table rail tools to icon buttons"
```
