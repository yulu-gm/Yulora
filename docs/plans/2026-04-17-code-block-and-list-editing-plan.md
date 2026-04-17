# Code Block And List Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修正代码块直编、代码块视觉换行、分隔符误判和列表 `Tab` 缩进这 4 个编辑体验问题。

**Architecture:** 保持 `markdown-engine -> editor-core -> renderer` 分层不变。先用解析测试锁定 `---` 分类，再用 editor/core 命令与装饰测试锁定代码块和列表行为，最后补样式断言，避免只修 UI 表象。

**Tech Stack:** Electron、React、TypeScript、CodeMirror 6、micromark、Vitest、CSS

---

### Task 1: 锁定代码块直编与代码块样式回归

**Files:**
- Modify: `src/renderer/code-editor.test.ts`
- Modify: `src/renderer/app.autosave.test.ts`
- Modify: `src/renderer/code-editor.ts`
- Modify: `src/renderer/styles/markdown-render.css`

**Step 1: 写失败测试**

- 在 `src/renderer/code-editor.test.ts` 新增测试：
  - 光标落在 fenced code block 内容行时，opening / closing fence 继续隐藏
  - 光标移动到 opening fence 行时，整块恢复源码态
- 在 `src/renderer/app.autosave.test.ts` 新增样式断言：
  - `markdown-render.css` 中代码块使用视觉换行
  - 不再使用横向滚动条

**Step 2: 运行测试确认失败**

Run: `npm run test -- src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`

Expected:
- 新增代码块直编测试失败，表现为当前进入内容行后 fence 仍露出源码态
- 新增样式断言失败，表现为仍存在 `white-space: pre` 或 `overflow-x: auto`

**Step 3: 写最小实现**

- 在 `packages/editor-core/src/decorations/block-decorations.ts` 为 active code fence 增加“内容行直编时仍保留代码块呈现”的分支
- 根据 selection 所在行区分：
  - 内容行：保留 fence 隐藏与内容样式
  - fence 行：恢复 raw 源码态
- 在 `src/renderer/styles/markdown-render.css` 将代码块改为视觉换行展示
- 如测试驱动需要，在 `src/renderer/code-editor.ts` 暴露最小测试入口

**Step 4: 运行测试确认通过**

Run: `npm run test -- src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`

Expected: PASS

### Task 2: 锁定 frontmatter 风格 `---` 分隔符误判

**Files:**
- Modify: `packages/markdown-engine/src/parse-block-map.test.ts`
- Modify: `packages/markdown-engine/src/parse-block-map.ts`
- Modify: `src/renderer/code-editor.test.ts`

**Step 1: 写失败测试**

- 在 `packages/markdown-engine/src/parse-block-map.test.ts` 新增 frontmatter 风格片段测试：
  - opening `---` 与 closing `---` 都应输出 `thematicBreak`
  - 中间 `name:` / `description:` 保持 paragraph
- 在 `src/renderer/code-editor.test.ts` 新增渲染回归测试：
  - 光标在元数据正文处时，closing `---` 仍渲染为分隔符而不是源码态

**Step 2: 运行测试确认失败**

Run: `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts src/renderer/code-editor.test.ts`

Expected:
- parse-block-map 新测试失败，closing `---` 被解析成 heading / paragraph 片段
- renderer 新测试失败，closing `---` 没有拿到 thematic break 装饰

**Step 3: 写最小实现**

- 在 `packages/markdown-engine/src/parse-block-map.ts` 的 `createSetextHeadingDerivedBlocks` 路径里补 frontmatter 风格 / 多行正文 + 显式 `---` 的拆分规则
- 保持已有 `+++` 特判和普通单行 setext heading 行为

**Step 4: 运行测试确认通过**

Run: `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts src/renderer/code-editor.test.ts`

Expected: PASS

### Task 3: 为列表增加 `Tab` 子列表缩进

**Files:**
- Modify: `packages/editor-core/src/commands/list-commands.ts`
- Modify: `packages/editor-core/src/commands/markdown-commands.ts`
- Modify: `packages/editor-core/src/commands/index.ts`
- Modify: `packages/editor-core/src/extensions/markdown.ts`
- Modify: `src/renderer/code-editor.ts`
- Modify: `src/renderer/code-editor.test.ts`

**Step 1: 写失败测试**

- 在 `src/renderer/code-editor.test.ts` 新增测试：
  - 第二条列表项按 `Tab` 后成为第一条的子列表
  - 当前项带续行或子项时，整个子树一起右移
  - 第一条同级项按 `Tab` 不生效

**Step 2: 运行测试确认失败**

Run: `npm run test -- src/renderer/code-editor.test.ts`

Expected:
- 因为当前没有 `Tab` 命令或控制器入口，新增测试失败

**Step 3: 写最小实现**

- 在 `packages/editor-core/src/commands/list-commands.ts` 增加 `runListIndentOnTab`
- 用 `activeBlockState.activeBlock?.type === "list"` 与 list item 元数据定位当前项
- 计算当前项子树范围，只给该范围每一行统一增加 2 个空格
- 在 `markdown-commands.ts` 和 `extensions/markdown.ts` 注册 `Tab` 键
- 在 `src/renderer/code-editor.ts` 增加测试用 `pressTab()`

**Step 4: 运行测试确认通过**

Run: `npm run test -- src/renderer/code-editor.test.ts`

Expected: PASS

### Task 4: 收口验证

**Files:**
- Verify only

**Step 1: 跑相关测试**

Run: `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts packages/editor-core/src/active-block.test.ts packages/editor-core/src/commands/line-parsers.test.ts packages/editor-core/src/decorations/block-decorations.test.ts src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts`

Expected: PASS

**Step 2: 跑类型检查**

Run: `npm run typecheck`

Expected: PASS

**Step 3: 记录结果**

- 确认仅修改与本轮需求直接相关的文件
- 准备简短任务总结，说明 4 个需求分别如何落地
