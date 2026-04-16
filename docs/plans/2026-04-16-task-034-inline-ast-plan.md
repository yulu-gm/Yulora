# TASK-034 Inline AST 行内渲染基础设施 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **Current-session note:** 如果在当前会话继续执行，主线程应使用 `superpowers:subagent-driven-development`，按下面的任务顺序逐个派发新子 agent；不要并行实现共享 write scope 的任务。

**Goal:** 在不推翻现有 top-level block map 的前提下，为 `markdown-engine` 建立完整 inline AST，并让 `editor-core` 用这套 AST 驱动非激活态 `bold / italic / inline code / strikethrough` 渲染，同时为紧接着的链接、图片和复杂嵌套任务建立稳定解析边界。

**Architecture:** 保留 `parseBlockMap()` 和 active-block 现有依赖的 top-level block 结构，但把 canonical 解析入口升级为 `parseMarkdownDocument()`。`markdown-engine` 负责 block + inline 语义，`editor-core` 只负责把 AST 变成 CodeMirror decorations；renderer 不重新解析 Markdown。本轮不做整份文档的完整 block AST，也不把链接/图片的视觉或 bridge 行为提前塞进 `TASK-034`。

**Tech Stack:** Electron, React, TypeScript, CodeMirror 6, micromark, Vitest

---

## Recommended Dispatch Order

- Task 1-4：同一名 `worker` 顺序负责 `packages/markdown-engine/`，保持 parser 上下文连贯
- Task 5-6：切换到新的 `worker` 负责 `packages/editor-core/` 与 `src/renderer/`，避免 parser 改动与装饰改动混在一个上下文里
- Task 7：由主线程或单独 `worker` 负责文档与验证收尾
- 每个实现任务完成后先做 spec review，再做 code quality review，再进入下一个任务

### Task 1: 锁定 canonical `MarkdownDocument` 与 inline AST 合同

**Files:**
- Create: `packages/markdown-engine/src/inline-ast.ts`
- Create: `packages/markdown-engine/src/markdown-document.ts`
- Modify: `packages/markdown-engine/src/block-map.ts`
- Modify: `packages/markdown-engine/src/index.ts`
- Modify: `packages/markdown-engine/src/parse-block-map.test.ts`

**Step 1: Write the failing contract tests**

在 `packages/markdown-engine/src/parse-block-map.test.ts` 先加 shape 断言，至少要求：
- `parseMarkdownDocument(source)` 存在
- `result.blocks[0]` 在 heading/paragraph/list/blockquote 场景里具备 inline-capable 字段
- `HeadingBlock.markerEnd`
- `ListItemBlock.contentStartOffset / contentEndOffset`
- `BlockquoteBlock.lines[]`
- `BlockMap` 与 `MarkdownDocument` 兼容

示例断言：

```ts
expect(result.blocks[0]).toMatchObject({
  type: "heading",
  markerEnd: 2,
  inline: {
    type: "root"
  }
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts`
Expected: FAIL，因为 canonical 文档类型、inline root 字段和新入口都还不存在。

**Step 3: Write the minimal type surface**

建立最小但稳定的类型边界：

```ts
export interface MarkdownDocument {
  blocks: MarkdownBlock[];
}

export type BlockMap = MarkdownDocument;

export interface InlineRoot {
  type: "root";
  startOffset: number;
  endOffset: number;
  children: InlineNode[];
}
```

要求：
- `MarkdownDocument` 成为 canonical 名称
- `BlockMap` 先保留兼容别名
- 节点类型一次性包含 `text / strong / emphasis / strikethrough / codeSpan / link / image`
- 当前实现尚未完成前，测试仍允许继续因 parser 未实现而失败

**Step 4: Re-run the focused test**

Run: `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts`
Expected: FAIL，但失败原因应变成“parser / data population 未完成”，而不是类型或导出缺失。

### Task 2: 为 inline AST 建立独立 parser 与本地 `strikethrough` extension

**Files:**
- Create: `packages/markdown-engine/src/parse-inline-ast.ts`
- Create: `packages/markdown-engine/src/parse-inline-ast.test.ts`
- Create: `packages/markdown-engine/src/extensions/strikethrough.ts`
- Modify: `packages/markdown-engine/src/index.ts`

**Step 1: Write the failing parser tests**

在 `parse-inline-ast.test.ts` 写出最小但覆盖未来扩展方向的失败用例：
- `**bold**`
- `*italic*`
- `` `code` ``
- `~~strike~~`
- `***both***`
- `~~**mix**~~`
- `**a \`code\` b**`
- `[**label**](https://example.com)`
- `![alt *x*](./demo.png)`
- unmatched markers 回退为 `text`

示例断言：

```ts
expect(root.children[0]).toMatchObject({
  type: "strong",
  openMarkerStart: 0,
  closeMarkerEnd: 8
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- packages/markdown-engine/src/parse-inline-ast.test.ts`
Expected: FAIL，因为 inline parser 和本地 `~~` extension 都还不存在。

**Step 3: Implement the parser in two layers**

实现要求：
- 先用 `micromark.parse().text()` + `preprocess()` + `postprocess()` 获取 inline events
- 为 `~~` 提供仓库内本地 extension，而不是额外安装外部包
- 事件转换层统一产出 AST，不允许在 `editor-core` 再做语法扫描
- `codeSpan` 内只保留纯文本子节点，不再递归 strong/emphasis/strikethrough
- 资源式 `link` / `image` 至少暴露 label/alt subtree 和 destination/title range

建议最小 API：

```ts
export function parseInlineAst(source: string, startOffset: number, endOffset: number): InlineRoot;
```

**Step 4: Re-run the focused test**

Run: `npm run test -- packages/markdown-engine/src/parse-inline-ast.test.ts`
Expected: PASS

### Task 3: 把 inline AST 接入 `parseMarkdownDocument()` 并补齐文本容器范围

**Files:**
- Create: `packages/markdown-engine/src/parse-markdown-document.ts`
- Modify: `packages/markdown-engine/src/parse-block-map.ts`
- Modify: `packages/markdown-engine/src/parse-block-map.test.ts`
- Modify only if needed: `packages/markdown-engine/src/block-map.ts`

**Step 1: Add the failing integration tests**

在 `parse-block-map.test.ts` 新增集成断言，要求：
- heading 暴露 `markerEnd` 与 `inline`
- paragraph 暴露 `inline`
- list item 暴露 `contentStartOffset / contentEndOffset / inline`
- blockquote 暴露 `lines[]`，且每行有 `markerEnd` 与 `inline`
- `parseBlockMap(source)` 仍返回可被现有调用点消费的结果

至少覆盖：
- heading + nested inline
- task list item + inline code
- multi-line blockquote with inline marks
- CRLF 文本

**Step 2: Run the integration test**

Run: `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts`
Expected: FAIL，因为 block parser 还没有把文本容器与 inline AST stitch 在一起。

**Step 3: Implement the canonical parse entrypoint**

要求：
- 抽出现有 top-level block parse 逻辑到 `parseMarkdownDocument()`
- 对 `heading / paragraph / list item / blockquote line` 调用 `parseInlineAst()`
- 所有 inline range 必须保持 absolute offsets
- `parseBlockMap()` 作为兼容包装，直接复用 `parseMarkdownDocument()`
- code fence / thematic break 继续保留现有 block 语义，不强行补 inline

**Step 4: Re-run both markdown-engine suites**

Run: `npm run test -- packages/markdown-engine/src/parse-inline-ast.test.ts packages/markdown-engine/src/parse-block-map.test.ts`
Expected: PASS

### Task 4: 迁移 editor-core 派生状态与 signature 到 `MarkdownDocument`

**Files:**
- Create: `packages/editor-core/src/derived-state/markdown-document-cache.ts`
- Modify: `packages/editor-core/src/derived-state/inactive-block-decorations.ts`
- Modify: `packages/editor-core/src/extensions/markdown.ts`
- Modify: `packages/editor-core/src/active-block.ts`
- Modify: `packages/editor-core/src/index.ts`
- Modify only if needed: `src/renderer/code-editor.ts`

**Step 1: Write the failing derived-state test**

在 `packages/editor-core/src/derived-state/inactive-block-decorations.test.ts` 或 `extensions/markdown.test.ts` 加断言：
- parser 改为返回 `MarkdownDocument` 后，active block 仍可正确解析
- 只改 inline markers 时，derived state 会刷新 decoration signature

**Step 2: Run the focused test**

Run: `npm run test -- packages/editor-core/src/derived-state/inactive-block-decorations.test.ts packages/editor-core/src/extensions/markdown.test.ts`
Expected: FAIL，因为 cache 和 signature 仍是 block-only 视角。

**Step 3: Write the minimal migration**

要求：
- 引入 `MarkdownDocumentCache` 作为 canonical cache 名称
- `active-block` 逻辑继续只看 top-level blocks，不改语义
- `blockDecorationSignature` 纳入 inline fingerprint
- `createYuloraMarkdownExtensions()` 继续对外暴露稳定接口，不把 renderer 绑到 parser 内部细节

**Step 4: Re-run the focused test**

Run: `npm run test -- packages/editor-core/src/derived-state/inactive-block-decorations.test.ts packages/editor-core/src/extensions/markdown.test.ts`
Expected: PASS

### Task 5: 用 inline AST 生成非激活态 inline decorations

**Files:**
- Create: `packages/editor-core/src/decorations/inline-decorations.ts`
- Modify: `packages/editor-core/src/decorations/block-decorations.ts`
- Modify: `packages/editor-core/src/decorations/index.ts`
- Modify: `packages/editor-core/src/decorations/signature.ts`
- Modify: `packages/editor-core/src/decorations/block-decorations.test.ts`

**Step 1: Write the failing decoration tests**

在 `block-decorations.test.ts` 中新增断言，至少覆盖：
- 非激活 paragraph 的 `**bold**` marker 被隐藏，正文被加 `strong` 样式
- `***both***` 叠加 strong + emphasis class
- `~~**mix**~~` 保留 nested class 叠加
- `codeSpan` marker 被隐藏，内部 `*` 不触发 emphasis decoration
- link/image 节点即使暂不做专门视觉，也不会破坏子节点 inline decorations

**Step 2: Run the focused test**

Run: `npm run test -- packages/editor-core/src/decorations/block-decorations.test.ts`
Expected: FAIL，因为当前 block decorations 只认识 block-level markers。

**Step 3: Implement AST-to-decoration flattening**

实现要求：
- 新增一个纯 helper，把 `InlineRoot` flatten 成 marker decorations 和 content decorations
- marker decoration 统一走 `.cm-inactive-inline-marker`
- 内容 decoration 分类型生成：
  - `.cm-inactive-inline-strong`
  - `.cm-inactive-inline-emphasis`
  - `.cm-inactive-inline-code`
  - `.cm-inactive-inline-strikethrough`
- `link` / `image` 本轮只递归 label/alt children，不新增视觉替换
- 非激活 block 才应用这些 decorations；active block 继续完整源码态

**Step 4: Re-run the focused test**

Run: `npm run test -- packages/editor-core/src/decorations/block-decorations.test.ts`
Expected: PASS

### Task 6: 把 inline 渲染接进 renderer 测试与样式

**Files:**
- Modify: `src/renderer/code-editor.test.ts`
- Modify: `src/renderer/styles.css`

**Step 1: Add renderer-facing failing tests**

新增回归用例：
- 段落中的 `**bold**`、`*italic*`、`` `code` ``、`~~strike~~` 在失焦或切到其他 block 时变为渲染态
- `***both***` 与 `~~**mix**~~` 在非激活态仍保留嵌套样式
- heading / list / blockquote 内的 inline styles 同样成立
- 光标回到对应 block 后，完整 Markdown 源码恢复
- composition 期间 inline decorations 不抖动，结束后只 flush 一次

**Step 2: Run the focused test**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: FAIL，因为当前 renderer 层只覆盖 block decorations，没有 inline assertions 与样式。

**Step 3: Implement the smallest renderer-facing changes**

要求：
- 在 `styles.css` 中为四类 inline 内容与 marker 提供克制样式
- marker 继续沿用当前项目的“隐藏真实 Markdown marker、保留文本 DOM”思路
- 不引入 widget replacement，不新增 React 层状态

**Step 4: Re-run the focused test**

Run: `npm run test -- src/renderer/code-editor.test.ts`
Expected: PASS

### Task 7: 更新文档、人工验收步骤并跑门禁

**Files:**
- Modify: `docs/decision-log.md`
- Modify: `docs/test-cases.md`
- Modify: `docs/test-report.md`
- Modify: `docs/progress.md`
- Modify only if needed: `MVP_BACKLOG.md`
- Create: `docs/plans/2026-04-16-task-034-handoff.md`
- Create: `reports/task-summaries/TASK-034.md`

**Step 1: Record the parser-boundary decision**

至少写清：
- `markdown-engine` 现在是 block + inline 语义唯一来源
- 当前仍保留 top-level block map，不做整份 block AST 迁移
- `parseBlockMap()` 是兼容包装，canonical 入口是 `parseMarkdownDocument()`
- `~~` 采用仓库内本地 extension，而不是外部依赖

**Step 2: Add or update the manual acceptance case**

在 `docs/test-cases.md` 增加 inline rendering 场景，至少覆盖：
- 普通段落中的四类样式
- heading / list / blockquote 中的嵌套样式
- 激活 / 非激活切换
- 中文 IME 输入后 decoration flush 不抖动

**Step 3: Run task-level verification**

Run:
- `npm run test -- packages/markdown-engine/src/parse-inline-ast.test.ts packages/markdown-engine/src/parse-block-map.test.ts packages/editor-core/src/derived-state/inactive-block-decorations.test.ts packages/editor-core/src/decorations/block-decorations.test.ts packages/editor-core/src/extensions/markdown.test.ts src/renderer/code-editor.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Expected:
- 全部 PASS
- 如果沙箱里再次出现 `spawn EPERM`，使用提权环境重跑并在 `docs/test-report.md` 明确记录

**Step 4: Write the execution handoff**

`docs/plans/2026-04-16-task-034-handoff.md` 至少写清：
- 改了什么
- 触达哪些 parser / decoration / style 文件
- 推荐的人工验收步骤
- 已知限制：reference-style links/images 仍未在本轮纳入
