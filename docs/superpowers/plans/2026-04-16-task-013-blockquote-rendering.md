# TASK-013 Blockquote Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 top-level 引用块补上非激活态淡色背景与缩进显示，并在激活时稳定恢复 Markdown 源码态。

**Architecture:** 继续沿用 `src/renderer/code-editor.ts` 中已有的 CodeMirror decoration 派生链，不引入新的 React 渲染层或 widget replacement。引用块仅在非激活态加 line/mark decorations；源码文本保持不变，光标进入块内即移除装饰。

**Tech Stack:** Electron, React, TypeScript, CodeMirror 6, Vitest

---

### Task 1: Blockquote editor decorations

**Files:**
- Modify: `src/renderer/code-editor.test.ts`
- Modify: `src/renderer/code-editor.ts`
- Modify: `src/renderer/styles.css`

- [ ] Step 1: 写 blockquote 的失败测试
- [ ] Step 2: 运行目标测试确认按预期失败
- [ ] Step 3: 用最小实现补上 inactive blockquote decorations
- [ ] Step 4: 运行目标测试确认通过
- [ ] Step 5: 补上激活恢复 / composition flush 回归测试并重复 red-green

### Task 2: Repository verification

**Files:**
- Modify: `docs/decision-log.md`
- Modify: `docs/test-report.md`
- Modify: `docs/progress.md`
- Modify: `reports/task-summaries/TASK-013.md`
- Modify: `MVP_BACKLOG.md`

- [ ] Step 1: 跑本任务相关测试
- [ ] Step 2: 跑仓库门禁
- [ ] Step 3: 更新任务文档与状态
