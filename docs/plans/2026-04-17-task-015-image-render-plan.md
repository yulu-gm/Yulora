# TASK-015 Image Render Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Markdown 图片补齐剪贴板导入、本地 `assets` 落盘，以及激活态/非激活态的常驻图片渲染。

**Architecture:** `main` 负责剪贴板读取与本地写文件，`preload` 暴露受限导入 API，`renderer` 只发起导入并插入 Markdown。图片显示统一复用 `markdown-engine` 的 inline AST，由 `editor-core` 生成 replace/block widget decorations，不再新增第二套 parser。

**Tech Stack:** Electron、React、TypeScript、CodeMirror 6、Vitest、micromark inline AST

---

### Task 1: 锁定图片 decoration 行为

**Files:**
- Modify: `packages/editor-core/src/decorations/block-decorations.test.ts`
- Modify: `src/renderer/code-editor.test.ts`

**Step 1: Write the failing test**

- 为非激活态补一个断言：`![alt](./demo.png)` 会生成图片 widget，而不是只保留 marker decorations。
- 为激活态补一个断言：当前 block 聚焦到图片语法时，源码仍在，图片 widget 也在。

**Step 2: Run test to verify it fails**

Run: `npm run test -- packages/editor-core/src/decorations/block-decorations.test.ts src/renderer/code-editor.test.ts`  
Expected: FAIL，提示缺少图片 widget / DOM 不存在。

**Step 3: Write minimal implementation**

- 在 `packages/editor-core` 中补图片 preview widget 数据与 decorations。

**Step 4: Run test to verify it passes**

Run: `npm run test -- packages/editor-core/src/decorations/block-decorations.test.ts src/renderer/code-editor.test.ts`

### Task 2: 锁定剪贴板图片导入链路

**Files:**
- Create: `src/main/clipboard-image-import.test.ts`
- Modify: `src/preload/preload.contract.test.ts`

**Step 1: Write the failing test**

- 覆盖 PNG 导入成功、相对路径生成、重名避让、未保存文档报错、非图片报错。
- 为 preload contract 补 `importClipboardImage` 调用与 channel 断言。

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/clipboard-image-import.test.ts src/preload/preload.contract.test.ts`  
Expected: FAIL，提示模块或 bridge 不存在。

**Step 3: Write minimal implementation**

- 新建 shared channel / result 类型
- 新建 main 导入服务
- 接到 preload contract

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/main/clipboard-image-import.test.ts src/preload/preload.contract.test.ts`

### Task 3: 接通 renderer 粘贴导入

**Files:**
- Modify: `src/renderer/code-editor.ts`
- Modify: `src/renderer/code-editor-view.tsx`
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/types.d.ts`

**Step 1: Write the failing test**

- 在 `src/renderer/code-editor.test.ts` 补一个粘贴图片事件测试：
  识别 image clipboard item 后会阻止默认行为，并把返回 Markdown 插入文档。

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderer/code-editor.test.ts`  
Expected: FAIL，提示没有拦截图片粘贴或未调用 bridge。

**Step 3: Write minimal implementation**

- controller 增加图片粘贴钩子
- App 侧实现 import request，并把错误写回现有 error banner

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderer/code-editor.test.ts`

### Task 4: 补样式与文档

**Files:**
- Modify: `src/renderer/styles/markdown-render.css`
- Modify: `docs/test-cases.md`
- Modify: `docs/decision-log.md`
- Modify: `docs/progress.md`
- Modify: `docs/test-report.md`
- Create: `reports/task-summaries/TASK-015.md`

**Step 1: Write / update tests first where applicable**

- 若样式选择器需要 DOM 断言，先补到 `src/renderer/code-editor.test.ts`

**Step 2: Implement**

- 图片容器、占位失败态、激活态源码与预览间距样式
- 同步任务记录与验收说明

**Step 3: Verify focused tests**

Run: `npm run test -- src/renderer/code-editor.test.ts`

### Task 5: 全量验证

**Step 1: Run repository gates**

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

**Step 2: Read outputs**

- 只有四项都 fresh green 才能宣称完成

**Step 3: Summarize**

- 写任务总结，记录已知限制与人工验收步骤
