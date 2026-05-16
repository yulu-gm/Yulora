# Editor Performance Optimization Handoff

## PERF-009 Handoff

### 状态

PASS，subagent 验收通过。

### 本轮完成内容

- 完成最终质量门禁与性能专项。
- 将长文档性能探针测试 timeout 调整为显式 15s，避免全量 Vitest 并发时被默认 5s timeout 误杀。
- 跑相关功能回归、全量 Vitest、空文档布局 probe 与真实 Markdown 编辑体验 probe。
- 更新 `docs/test-report.md`、`docs/decision-log.md`、`progress.md` 与任务总结。

### 落点文件

- `packages/editor-core/src/performance/editor-performance-probe.test.ts`
- `src/renderer/performance/document-derived-ui.perf.test.ts`
- `docs/test-report.md`
- `docs/decision-log.md`
- `reports/task-summaries/editor-performance-optimization.md`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

### 验证命令

已执行并通过：

```bash
npm run typecheck
npm run lint
npm run build
npm run perf:baseline
npm run test -- packages/editor-core/src/decorations packages/editor-core/src/commands packages/editor-core/src/extensions/markdown.test.ts src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useSaveController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/app.autosave.test.ts src/renderer/export-html.test.ts src/renderer/editor/ThemeSurfaceHost.test.tsx src/main/workspace-application.test.ts src/main/workspace-service.test.ts src/preload/preload.contract.test.ts src/main/analyze-renderer-bundle.test.ts
npm test
npm run test:empty-document-layout
npm run test:editing-experience
git diff --check
```

### 关键输出

- 全量 Vitest：104 files / 1040 tests 通过。
- 相关回归：24 files / 384 tests 通过。
- `perf:baseline`：4 files / 7 tests 通过。
- `perf:bundle`：`bundleBudget=PASS`。
- App chunk：229,680 bytes，gzip 63,743 bytes。
- First editor load initial gzip：227,693 bytes。
- Editor insertText：约 426.79 ms，parseCalls 1，`markdownDocument=1`，`blockMap=0`。
- Selection move：约 10.17 ms，parseCalls 0。
- Ordered-list edit：约 428.31 ms，parseCalls 2，`markdownDocument=1`，`blockMap=1`。
- 空文档布局 probe：PASS。
- Markdown 编辑体验 probe：PASS。

### 已知风险

- outline / metrics 的算法本身仍是长文档重计算成本中心；本轮把它们移出 keypress 同步路径，但没有改成增量算法。
- 多 range paste 的 ordered-list normalization 仍保留全文 fallback，这是语义优先策略。
- 耗时数字会随机器负载波动，长期硬门槛由 parse count、bundle budget 与回归测试承担。

## PERF-008 Handoff

### 状态

PASS，subagent 验收通过。

### 本轮完成内容

- `analyze-renderer-bundle.mjs` 增加 `bundleBudget=PASS/FAIL` 输出。
- analyzer 从 `index.html` 入口与 editor chunk 递归读取 JS 静态 import，形成 first editor load 的 `initialChunks`。
- `lazyChunks` 改为 `initialChunks` 的补集，避免同一 chunk 既算 initial 又算 lazy。
- 增加 budget checks：
  - 最大初始 chunk raw / gzip。
  - first editor load initial gzip。
  - 总 JS gzip。
  - required lazy chunks。
  - forbidden initial source groups。
- `requiredLazyChunk` 现在会在目标 chunk 被静态拉入 first editor load 时失败。
- `perf:bundle` 接入 budget gate，失败会让 analyzer 非 0 退出。
- `npm ls --omit=dev --depth=0` 确认生产依赖仍只有 `electron-updater`。

### 落点文件

- `scripts/analyze-renderer-bundle.mjs`
- `src/main/analyze-renderer-bundle.test.ts`
- `package.json`
- `docs/test-report.md`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

### 验证命令

已执行并通过：

```bash
npm run test -- src/main/analyze-renderer-bundle.test.ts
npm run perf:bundle
npm run typecheck
npm run lint
npm run build
npm ls --omit=dev --depth=0
```

### 关键输出

- analyzer 测试：1 file / 2 tests 通过。
- `perf:bundle` 输出 `bundleBudget=PASS`。
- 最新 bundle budget：
  - largest initial chunk：255,081 bytes，gzip 82,117 bytes。
  - first editor load initial gzip：227,693 bytes。
  - total JS gzip：344,025 bytes。
  - `requiredLazyChunk:export-html`：PASS。
  - `requiredLazyChunk:theme-surface-runtime`：PASS。
  - JS/Python/HTML parser forbidden initial source groups：PASS。
- production dependencies：`electron-updater@6.8.3`。

### Subagent 验收

结果：PASS。

结论：

- spec review：首次 FAIL，指出 `lazyChunks` 不是 initial complement、`requiredLazyChunk` 只按名称启发式判断，以及 docs/test-report 未同步。
- 已修复：analyzer 使用静态 import 闭包定义 first editor load，`lazyChunks` 改成补集，required lazy 会对静态拉回失败；文档与 test report 已补。
- spec re-review：PASS。

## PERF-007 Handoff

### 状态

PASS，subagent 验收通过。

### 本轮完成内容

- HTML export 改为 export command 内 dynamic import。
- Theme surface runtime 改为 active surface mount 时 dynamic import；effects off 不加载 runtime。
- code fence language parsers 从 `code-highlight.ts` 顶层 static import 移出。
- 新增 code fence language lazy loader，首次遇到语言时请求 parser chunk。
- decoration 构建保持同步，parser 未 ready 时返回空高亮，parser-loaded 后 force refresh decorations。

### 落点文件

- `src/renderer/editor/useEditorApplicationController.ts`
- `src/renderer/editor/ThemeSurfaceHost.tsx`
- `packages/editor-core/src/decorations/code-highlight-language-loader.ts`
- `packages/editor-core/src/decorations/code-highlight.ts`
- `packages/editor-core/src/extensions/markdown.ts`
- `packages/editor-core/src/decorations/code-highlight.test.ts`
- `packages/editor-core/src/extensions/markdown.test.ts`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

### 验证命令

已执行并通过：

```bash
npm run test -- packages/editor-core/src/decorations/code-highlight.test.ts packages/editor-core/src/extensions/markdown.test.ts src/renderer/editor/ThemeSurfaceHost.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx
npm run test -- packages/editor-core/src/decorations packages/editor-core/src/extensions/markdown.test.ts src/renderer/editor/ThemeSurfaceHost.test.tsx src/renderer/export-html.test.ts src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/app.autosave.test.ts
npm run typecheck
npm run lint
npm run build
npm run perf:baseline
find dist/assets -maxdepth 1 -name '*.map' -print
```

### 关键输出

- 相关测试：7 files / 237 tests 通过。
- `App` chunk 从 PERF-006 的 797,450 bytes / gzip 254,250 bytes 降到 229,680 bytes / gzip 63,743 bytes。
- lazy chunks 包含 `export-html-*`、`theme-surface-runtime-*` 与 language parser chunks。
- `npm run build` 不再出现 `App` chunk 超过 500 kB 的 warning。

### Subagent 验收

结果：PASS。

结论：

- spec review：PASS。
- code quality review：PASS。

## PERF-006 Handoff

### 状态

PASS，subagent 验收通过。

### 本轮完成内容

- `updateDraft()` 不再在每次输入时调用 `fishmark.updateWorkspaceTabDraft()` 发送整篇 content。
- 输入路径只更新 renderer-local active draft projection 和 dirty 状态。
- `flushActiveWorkspaceDraft()` 在 save/autosave/save as/tab switch/close/open/window close 等动作边界读取最新 editor buffer，并串行执行完整 draft sync。
- 旧 IPC snapshot 返回时保留同一 active tab 的本地 draft，避免旧 snapshot 覆盖新输入。
- 新增 100 次连续输入覆盖，证明 flush 前 0 次完整 draft IPC，flush 后只同步最新内容。
- 新增 dirty active tab 从 tab strip close 前 flush 覆盖，并断言 flush 顺序早于 `closeWorkspaceTab`。

### 落点文件

- `src/renderer/editor/useWorkspaceController.ts`
- `src/renderer/editor/useWorkspaceController.test.tsx`
- `src/renderer/app.autosave.test.ts`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

### 验证命令

已执行并通过：

```bash
npm run test -- src/renderer/editor/useWorkspaceController.test.tsx
npm run test -- src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useSaveController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/main/workspace-application.test.ts src/main/workspace-service.test.ts src/preload/preload.contract.test.ts
npm run test -- src/renderer/app.autosave.test.ts src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useSaveController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx
npm run test -- src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useSaveController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/main/workspace-application.test.ts src/main/workspace-service.test.ts src/preload/preload.contract.test.ts src/renderer/app.autosave.test.ts
npm run test -- src/renderer/editor/useWorkspaceController.test.tsx src/renderer/app.autosave.test.ts
npm run typecheck
npm run lint
npm run build
npm run perf:baseline
find dist/assets -maxdepth 1 -name '*.map' -print
```

### 关键输出

- PERF-006 相关测试：7 files / 197 tests 通过；补测后 `useWorkspaceController` + `app.autosave` 为 2 files / 165 tests 通过。
- `perf:baseline` 通过。
- 最新 parse count：
  - `insertText`: 约 451.49 ms，parseCalls 1，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=0`。
  - `selectionMove`: 约 3.60 ms，parseCalls 0，`parserCalls.markdownDocument=0`，`parserCalls.blockMap=0`。
  - `orderedListEdit`: 约 454.55 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
- 最新 bundle report：
  - renderer JS 总量：1,008,430 bytes，gzip 320,695 bytes。
  - editor chunk：`App-CJMN5Qc1.js` 797,450 bytes，gzip 254,250 bytes。
- `perf:baseline` 后当前 `dist/assets` 无 `.map` 残留。

### 已知风险

- main 仍持有 workspace session 与保存状态；这是刻意保留的职责边界。
- 完整 content sync 仍使用现有 `updateWorkspaceTabDraft` IPC，只是触发时机从每次输入移到动作边界。
- 后续修改 save/autosave/tab/window close/open 流程时，必须保留 flush-before-boundary 的顺序测试。

### Subagent 验收

结果：PASS

结论：

- spec review：首次 FAIL，指出 100 次连续输入和 dirty active tab close 覆盖不足。
- 已修复：补充 100 次连续输入测试和 dirty close 前 flush 顺序测试。
- spec re-review：PASS。
- code quality review：PASS。

## PERF-005 Handoff

### 状态

PASS，subagent 验收通过。

### 本轮完成内容

- `computeNormalizedOrderedListDocument()` 增加 `changedRanges`。
- 单 range 输入按 changed range 所在连续非空 run 定位 candidate slice，只解析该 slice。
- 非列表输入和空行后追加普通文本不会触发 ordered-list normalization `parseBlockMap`。
- 列表输入只 normalize 与 changed range 相交的当前 root list。
- 多 range paste 保留全文 fallback，保证复杂编辑语义优先正确。
- 修复 lazy continuation / top-level plain-text tail root list 语义，避免局部 candidate 截断导致编号重启失效。

### 落点文件

- `packages/editor-core/src/commands/list-edits.ts`
- `packages/editor-core/src/commands/list-edits.test.ts`
- `packages/editor-core/src/extensions/markdown.ts`
- `packages/editor-core/src/extensions/markdown.test.ts`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

### 验证命令

已执行并通过：

```bash
npm run test -- packages/editor-core/src/commands/list-edits.test.ts
npm run test -- packages/editor-core/src/extensions/markdown.test.ts
npm run test -- packages/editor-core/src/commands packages/editor-core/src/extensions/markdown.test.ts packages/editor-core/src/performance/editor-performance-probe.test.ts
npm run typecheck
npm run lint
npm run build
npm run perf:baseline
find dist/assets -maxdepth 1 -name '*.map' -print
```

### 关键输出

- PERF-005 相关测试：13 files / 128 tests 通过。
- `perf:baseline` 通过。
- 最新 parse count：
  - `insertText`: 约 468.46 ms，parseCalls 1，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=0`。
  - `selectionMove`: 约 3.91 ms，parseCalls 0，`parserCalls.markdownDocument=0`，`parserCalls.blockMap=0`。
  - `orderedListEdit`: 约 443.83 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
- 最新 bundle report：
  - renderer JS 总量：1,007,910 bytes，gzip 320,543 bytes。
  - editor chunk：`App-pC_sLgI6.js` 796,930 bytes，gzip 254,098 bytes。
- `perf:baseline` 后当前 `dist/assets` 无 `.map` 残留。

### 已知风险

- 多 range paste 仍保留全文 fallback，这是刻意的语义优先策略。
- 单 range candidate 基于连续非空 run，再交给 parser 判定 root list；后续若 Markdown list parser 改变 lazy continuation 语义，需要同步更新这里的回归测试。
- 输入仍会触发现有完整 draft sync IPC，留给 PERF-006。

### Subagent 验收

结果：PASS

结论：

- spec review：首次 FAIL，指出 lazy-continuation / plain-text tail root list candidate 漏收。
- spec re-review：再次 FAIL，指出变更直接落在 plain-text tail 行本身仍会漏收。
- 已修复：candidate 不再要求 anchor line 本身像 list，只要求连续非空 run 内存在 list marker；插入 range anchor 改为 `changedRange.to - 1`，避免空行后普通文本误扫。
- spec final re-review：PASS。
- code quality review：PASS。

## PERF-004 Handoff

### 状态

PASS，subagent 验收通过。

### 本轮完成内容

- selection-only 且 source 不变时，`markdown.ts` 不再触发全文 `createBlockDecorations()`。
- 新增 `createSelectionScopedBlockDecorations()`，只重建 previous / next active block 的 decoration range。
- 使用 CodeMirror `DecorationSet.update()` 在受影响 block span 内过滤旧 decoration 并添加新 decoration。
- code fence highlight 增加 language alias 归一与 `language + code content hash` 缓存。
- 超长 code fence 超过同步高亮上限时跳过 parser work，仅保留基础 code block 样式。
- 新增跨 block 与列表跨行 selection-only 测试，覆盖 active presentation 正确更新且 full decoration build hook 不触发。

### 落点文件

- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/decorations/code-highlight.ts`
- `packages/editor-core/src/decorations/code-highlight-cache.ts`
- `packages/editor-core/src/decorations/code-highlight.test.ts`
- `packages/editor-core/src/extensions/markdown.ts`
- `packages/editor-core/src/extensions/markdown.test.ts`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

### 验证命令

已执行并通过：

```bash
npm run test -- packages/editor-core/src/decorations packages/editor-core/src/extensions/markdown.test.ts
npm run typecheck
npm run lint
npm run build
npm run perf:baseline
find dist/assets -maxdepth 1 -name '*.map' -print
```

### 关键输出

- PERF-004 相关测试：3 files / 58 tests 通过。
- `perf:baseline` 通过。
- 最新 parse count：
  - `insertText`: 约 594.04 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
  - `selectionMove`: 约 4.45 ms，parseCalls 0，`parserCalls.markdownDocument=0`，`parserCalls.blockMap=0`。
  - `orderedListEdit`: 约 581.41 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
- 最新 bundle report：
  - renderer JS 总量：1,006,360 bytes，gzip 320,055 bytes。
  - editor chunk：`App-DXvJ_RC_.js` 795,380 bytes，gzip 253,608 bytes。
- `perf:baseline` 后当前 `dist/assets` 无 `.map` 残留。

### 已知风险

- scoped decoration range 与 CodeMirror decoration filtering 仍是高敏路径，后续修改 block decoration span 时要保留跨 block / 列表跨行测试。
- code fence parser 仍是顶层静态 import；本轮只加缓存与超长 fallback，lazy parser import 留给 PERF-007。
- ordered-list normalization 仍会触发全文 `parseBlockMap`，留给 PERF-005。

### Subagent 验收

结果：PASS

结论：

- spec review：首次 FAIL，指出跨 block / 跨行 selection-only 仍可能回退全文 rebuild，测试覆盖不足。
- 已修复：selection-only source 不变时使用 scoped decoration path，只替换受影响 block span。
- spec re-review：PASS。
- code quality review：PASS。

## PERF-003 Handoff

### 状态

PASS，subagent 验收通过。

### 本轮完成内容

- 新增 `useDocumentDerivedDataController`：
  - `applyDocumentDerivedDataNow(content)` 用于文档打开 / 切换时立即刷新 outline 与 metrics。
  - `scheduleDocumentDerivedDataUpdate(content)` 用于输入路径延迟刷新，只处理最新内容。
- `useEditorWorkflowController` 不再同步调用 outline 派生，改为调度 derived-data 更新。
- `App.tsx` render 阶段不再直接调用 `getDocumentMetrics(fullContent)`。
- `App.tsx` 的 active document effect 改为只跟 active tab / editor load revision 对齐，避免 draft snapshot 内容更新触发同步 metrics 重算。
- 新增 App 集成测试，证明输入后 theme runtime `wordCount` 在同一 tick 内保持旧值，延迟任务后刷新到最新内容。

### 落点文件

- `src/renderer/editor/useDocumentDerivedDataController.ts`
- `src/renderer/editor/useDocumentDerivedDataController.test.tsx`
- `src/renderer/editor/App.tsx`
- `src/renderer/editor/useEditorWorkflowController.ts`
- `src/renderer/editor/useEditorApplicationController.ts`
- `src/renderer/editor/useWorkspaceController.test.tsx`
- `src/renderer/editor/useEditorApplicationController.test.tsx`
- `src/renderer/app.autosave.test.ts`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

### 验证命令

已执行并通过：

```bash
npm run test -- src/renderer/editor/useDocumentDerivedDataController.test.tsx src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/outline.test.ts src/renderer/document-metrics.test.ts src/renderer/app.autosave.test.ts
npm run typecheck
npm run lint
npm run build
npm run perf:baseline
```

### 关键输出

- PERF-003 相关测试：6 files / 179 tests 通过。
- `perf:baseline` 通过。
- 最新 parse count：
  - `insertText`: 约 585.25 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
  - `selectionMove`: 约 61.02 ms，parseCalls 0，`parserCalls.markdownDocument=0`，`parserCalls.blockMap=0`。
  - `orderedListEdit`: 约 618.33 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
- 最新 renderer derived-data baseline：
  - outline：500 items，约 509.21 ms。
  - metrics：meaningfulCharacterCount 61,136，约 553.81 ms。
- 最新 bundle report：
  - renderer JS 总量：1,002,562 bytes，gzip 318,990 bytes。
  - editor chunk：`App-DiXmtmhR.js` 791,582 bytes，gzip 252,547 bytes。
- `perf:baseline` 后当前 `dist/assets` 无 `.map` 残留。

### 已知风险

- PERF-003 只移动 renderer derived-data 调度位置，不改变 `deriveOutlineItems()` / `getDocumentMetrics()` 的算法。
- 当前 worktree 中 `src/renderer/document-metrics.ts` 与 `src/renderer/document-metrics.test.ts` 已存在相对 HEAD 的语义 diff；该 diff 不是 PERF-003 本轮产生的改动，本轮没有修改这两个文件。
- 输入仍会触发现有完整 draft sync IPC，留给 PERF-006。
- 当前还没有把 renderer outline 直接接入 PERF-002 的 `outlineHeadings` projection；本轮先通过 debounce 将成本移出 keypress 同步路径。
- bundle size 小幅上升，留给 PERF-007 / PERF-008 处理。

### 建议验收重点

- 检查 `App.tsx` render 阶段是否不再调用 `getDocumentMetrics(fullContent)`。
- 检查输入路径是否只调用 `scheduleDocumentDerivedDataUpdate()`，没有直接 `deriveOutlineItems(content)`。
- 检查 active document draft snapshot 更新是否不会触发文档打开 effect 同步重算 metrics。
- 检查延迟 wordCount 更新是否不会永久过期。

### Subagent 验收

结果：PASS

结论：

- spec review：首次 FAIL，将既有 `document-metrics.ts` / `.test.ts` 语义 diff 归入 PERF-003。
- 已澄清：该 diff 是 PERF-003 开始前已存在的 out-of-scope worktree 改动，本轮没有修改这两个文件。
- spec re-review：PASS。
- code quality review：PASS。

## PERF-002 Handoff

### 状态

PASS，subagent 验收通过。

### 本轮完成内容

- 新增统一 `EditorDerivedState`：
  - `source`
  - `selection`
  - `markdownDocument`
  - `activeBlockState`
  - `tableCursor`
  - `referenceDefinitions`
  - `outlineHeadings`
- 将 `parseMarkdownDocument()` 已经收集到的 `referenceDefinitions` 随 `MarkdownDocument` 返回。
- `deriveInactiveBlockDecorationsState()` 支持直接消费 `EditorDerivedState`，避免再次读取 document cache。
- `createBlockDecorations()` 支持复用 `referenceDefinitions`，避免 decoration 阶段重复扫描全文 definitions。
- `createFishMarkMarkdownExtensions()` 的 create / recompute 路径先创建统一 derived state，再派生 inactive decorations。
- 新增 parse spy 测试：
  - 单次普通输入最多一次 Markdown document parse。
  - selection-only update 不重新 parse Markdown document。
- 修复 code quality review 反馈：
  - `EditorDerivedState.referenceDefinitions` 区分“parser 已知为空 map”和“legacy lean document 没有元数据”。
  - legacy `blockMapCache(parseBlockMap)` 路径缺少 reference metadata 时，`createBlockDecorations()` 继续 fallback 收集 definitions。
  - 新增 list reference-style image widget 回归测试。

### 落点文件

- `packages/editor-core/src/derived-state/editor-derived-state.ts`
- `packages/editor-core/src/derived-state/editor-derived-state.test.ts`
- `packages/editor-core/src/derived-state/inactive-block-decorations.ts`
- `packages/editor-core/src/derived-state/inactive-block-decorations.test.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/extensions/markdown.ts`
- `packages/editor-core/src/extensions/markdown.test.ts`
- `packages/editor-core/src/index.ts`
- `packages/markdown-engine/src/markdown-document.ts`
- `packages/markdown-engine/src/parse-markdown-document.ts`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

### 验证命令

已执行并通过：

```bash
npm run test -- packages/editor-core/src/derived-state packages/editor-core/src/extensions/markdown.test.ts
npm run test -- packages/editor-core/src/decorations packages/editor-core/src/derived-state packages/editor-core/src/extensions/markdown.test.ts
npm run test -- packages/markdown-engine
npm run perf:baseline
npm run typecheck
npm run lint
npm run build
```

### 关键输出

- 修复 review finding 后 editor-core 相关测试：5 files / 60 tests 通过。
- markdown-engine 测试：3 files / 61 tests 通过。
- `perf:baseline` 通过。
- 最新 parse count：
  - `insertText`: 约 606.44 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
  - `selectionMove`: parseCalls 0，`parserCalls.markdownDocument=0`，`parserCalls.blockMap=0`。
  - `orderedListEdit`: 约 625.49 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
- 最新 bundle report：
  - renderer JS 总量：1,001,743 bytes，gzip 318,969 bytes。
  - editor chunk：`App-6qXm878j.js` 790,763 bytes，gzip 252,522 bytes。
- `npm run build` 单独复跑通过，当前 `dist/assets` 无 `.map` 残留。

### 已知风险

- PERF-002 只收敛 editor-core 内部派生状态，outline / metrics 仍在 renderer shell 中同步全量派生，留给 PERF-003。
- ordered-list normalization 仍会独立 `parseBlockMap`，留给 PERF-005。
- `EditorDerivedState.outlineHeadings` 已提供 heading projection，但 renderer 还未接入。
- 当前 worktree 存在其他非本轮改动，本轮未回退或整理。

### 建议验收重点

- 检查 `EditorDerivedState` 是否没有把 CodeMirror 类型泄漏到 markdown-engine。
- 检查 `parseMarkdownDocument` 返回 `referenceDefinitions` 是否只增加元数据，不改变 block AST。
- 检查 `markdown.ts` 的 create / recompute 路径是否复用同一 `EditorDerivedState`。
- 检查 selection-only parse spy 是否覆盖真实 `EditorView` transaction，而不是只测纯 cache。

### Subagent 验收

结果：PASS

结论：

- spec review：PASS。
- code quality review：首次 FAIL，指出 legacy `parseBlockMap` / `blockMapCache` 路径缺失 `referenceDefinitions` fallback。
- 已修复：`referenceDefinitions` 缺失保留为 `undefined`，让 `createBlockDecorations()` 继续 fallback `collectReferenceDefinitions(source)`。
- code quality re-review：PASS。

## PERF-001 Handoff

## 状态

PASS，subagent 验收通过。

## 本轮完成内容

- 新增长文档 fixture builder，可生成：
  - 5000 行纯段落文档
  - 5000 行混合 Markdown 文档
  - 100 个 fenced code block 文档
- 新增 editor-core 性能探针，统计：
  - `insertText`
  - `selectionMove`
  - `orderedListEdit`
  - 每项 duration 与 parseCalls
  - `parseMarkdownDocument` 与 ordered-list normalization `parseBlockMap` 的调用拆分
- 新增 renderer derived-data 性能探针，统计：
  - `deriveOutlineItems`
  - `getDocumentMetrics`
- 新增 renderer bundle analyzer：
  - JS 总量
  - gzip 总量
  - editor chunk
  - React chunks
  - lazy chunks
  - sourcemap source groups
- 新增 npm 命令：
  - `npm run perf:bundle`
  - `npm run perf:baseline`
- 更新本文件夹内任务状态与进度。

## 落点文件

- `package.json`
- `scripts/analyze-renderer-bundle.mjs`
- `src/main/analyze-renderer-bundle.test.ts`
- `packages/editor-core/src/performance/long-document-fixtures.ts`
- `packages/editor-core/src/performance/long-document-fixtures.test.ts`
- `packages/editor-core/src/performance/editor-performance-probe.ts`
- `packages/editor-core/src/performance/editor-performance-probe.test.ts`
- `packages/editor-core/src/commands/list-edits.ts`
- `packages/editor-core/src/extensions/markdown.ts`
- `src/renderer/performance/document-derived-ui.ts`
- `src/renderer/performance/document-derived-ui.perf.test.ts`
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

## 验证命令

已执行并通过：

```bash
npm run test -- packages/editor-core/src/performance src/renderer/performance src/main/analyze-renderer-bundle.test.ts
npm run perf:baseline
npm run typecheck
npm run build
npm run lint
```

## 关键输出

`npm run perf:baseline` 输出了：

- renderer JS 总量：1,000,593 bytes，gzip 318,616 bytes。
- editor chunk：`App-Dtis4Qeu.js` 789,613 bytes，gzip 252,173 bytes。
- 5000 行 mixed fixture：sourceLength 101,027。
- renderer outline：500 items，约 504.87 ms。
- renderer metrics：meaningfulCharacterCount 61,136，约 581.38 ms。
- editor insertText：约 707.88 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。
- editor selectionMove：约 225.48 ms，parseCalls 0，`parserCalls.markdownDocument=0`，`parserCalls.blockMap=0`。
- editor orderedListEdit：约 700.13 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。

## 已知风险

- PERF-001 只建立基线，不修复性能风险。
- `perf:bundle` 会先跑 sourcemap build，再跑普通 renderer build 还原 `dist`，因此执行时间和输出较多。
- Vite chunk-size warning 仍存在，这是后续 PERF-007 的目标。
- 当前 worktree 存在其他未提交改动，本轮没有回退或整理那些文件。
- `list-edits.ts` 与 `extensions/markdown.ts` 只增加 parser 注入口，目的是让基线能观测 ordered-list normalization 的 `parseBlockMap`，不改变默认运行逻辑。

## Subagent 验收

结果：PASS

结论：

- PERF-001 的 route-map 验收项都有实现和命令证据。
- ordered-list normalization 的 `parseBlockMap` 已计入 `parserCalls.blockMap` 与总 `parseCalls`。
- `perf:bundle` 不残留 sourcemap 产物。
- 新增和修改代码只服务基线观测，不改变用户可见编辑行为。

## 建议验收重点

- 检查 `PERF-001` route-map 的每条验收标准是否有对应实现或命令证据。
- 检查新增测试是否只覆盖基线工具，不把当前性能数字写成长期固定门槛。
- 检查新增脚本是否不会留下 sourcemap 构建产物。
- 检查 `npm run perf:baseline` 输出是否包含 parse count、输入/selection duration、bundle chunk size。
