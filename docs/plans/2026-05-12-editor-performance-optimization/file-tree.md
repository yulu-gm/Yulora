# Editor Performance Optimization File Tree

## 文档边界

本轮规划文档位于同一个子文件夹：

- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`

后续实现阶段如果推进任一 PERF task，必须同步更新该文件夹内 `progress.md`。

## PERF-001 已落地文件

- `package.json`
  - 增加 `perf:baseline`、`perf:bundle`。
- `scripts/analyze-renderer-bundle.mjs`
  - 新增 renderer bundle 分析脚本。
- `src/main/analyze-renderer-bundle.test.ts`
  - 覆盖 bundle analyzer 的 JSON 输出、chunk role 与 sourcemap source groups。
- `packages/editor-core/src/performance/long-document-fixtures.ts`
  - 新增长文档 fixture builder。
- `packages/editor-core/src/performance/long-document-fixtures.test.ts`
  - 覆盖 5000 行纯段落、5000 行 mixed Markdown、100 个 fenced code block。
- `packages/editor-core/src/performance/editor-performance-probe.ts`
  - 新增 editor-core 输入、selection、ordered-list edit 性能探针。
- `packages/editor-core/src/performance/editor-performance-probe.test.ts`
  - 覆盖探针输出与 parser 调用计数。
- `packages/editor-core/src/commands/list-edits.ts`
  - 为 ordered-list normalization 增加可注入 `parseBlockMap`，用于基线观测。
- `packages/editor-core/src/extensions/markdown.ts`
  - 将 ordered-list normalization 的 parser 注入口传给 list edits。
- `src/renderer/performance/document-derived-ui.ts`
  - 新增 outline / metrics 派生数据性能探针。
- `src/renderer/performance/document-derived-ui.perf.test.ts`
  - 覆盖 renderer derived-data 基线输出。
- `docs/plans/2026-05-12-editor-performance-optimization/handoff.md`
  - 新增 PERF-001 验收交接说明。

边界：

- PERF-001 不改变默认编辑行为，只增加观测工具、测试与 parser 注入口。
- 后续任务不得把 PERF-001 耗时数字写死为长期硬门槛；parse count 和 bundle size 更适合作为回归门槛。

## PERF-002 已落地文件

- `packages/editor-core/src/derived-state/editor-derived-state.ts`
  - 新增统一 editor-core 派生状态。
  - 承载 `source`、`selection`、`markdownDocument`、`activeBlockState`、`tableCursor`、`referenceDefinitions`、`outlineHeadings`。
- `packages/editor-core/src/derived-state/editor-derived-state.test.ts`
  - 覆盖单次 Markdown document parse、table cursor、reference definitions、heading projection。
- `packages/editor-core/src/derived-state/inactive-block-decorations.ts`
  - 支持消费已创建的 `EditorDerivedState`。
- `packages/editor-core/src/derived-state/inactive-block-decorations.test.ts`
  - 覆盖传入 `EditorDerivedState` 时不再次读取 document cache。
- `packages/editor-core/src/decorations/block-decorations.ts`
  - 支持复用 parser 已收集的 `referenceDefinitions`。
- `packages/editor-core/src/extensions/markdown.ts`
  - create / recompute 路径先创建 `EditorDerivedState`，再派生 decorations。
- `packages/editor-core/src/extensions/markdown.test.ts`
  - 新增 parse spy 测试，覆盖普通输入和 selection-only update。
- `packages/editor-core/src/index.ts`
  - 导出 `EditorDerivedState` 相关类型与创建函数，供后续 renderer/outline 优化使用。
- `packages/markdown-engine/src/markdown-document.ts`
  - 为 `MarkdownDocument` 增加可选 `referenceDefinitions` 元数据。
- `packages/markdown-engine/src/parse-markdown-document.ts`
  - 将 `collectReferenceDefinitions(source)` 的结果随 `MarkdownDocument` 返回。

边界：

- PERF-002 未改变 Markdown AST 语义，只把 parser 已有的 reference definition 派生结果暴露给 editor-core 复用。
- PERF-002 未把 ordered-list normalization 并入 `EditorDerivedState`；该路径仍在 transaction filter 中保持原有行为，留给 PERF-005 收缩范围。
- PERF-002 未改 main / preload / renderer IPC 边界。

## PERF-003 已落地文件

- `src/renderer/editor/useDocumentDerivedDataController.ts`
  - 新增 renderer derived-data 调度层。
  - 文档打开 / 切换路径立即计算 outline 与 metrics。
  - 输入路径 debounce 到最新内容后再计算 outline 与 metrics。
- `src/renderer/editor/useDocumentDerivedDataController.test.tsx`
  - 覆盖立即 apply 与延迟 schedule 只使用最新内容。
- `src/renderer/editor/App.tsx`
  - 移除 render 阶段 `getDocumentMetrics(fullContent)`。
  - 移除输入路径同步 `deriveOutlineItems(content)`。
  - active document effect 只跟 active tab / editor load revision 对齐，不随 draft snapshot 内容变动重算。
- `src/renderer/editor/useEditorWorkflowController.ts`
  - 将同步 `updateOutline` 改为 `scheduleDocumentDerivedDataUpdate`。
- `src/renderer/editor/useEditorApplicationController.ts`
  - 透传新的 derived-data schedule 边界。
- `src/renderer/editor/useWorkspaceController.test.tsx`
  - 更新 workflow controller 断言，确认输入路径调度 derived data。
- `src/renderer/editor/useEditorApplicationController.test.tsx`
  - 更新 controller 输入类型。
- `src/renderer/app.autosave.test.ts`
  - 新增集成测试，证明输入 tick 内 theme runtime word count 不同步更新，延迟任务后刷新。

边界：

- PERF-003 不改变 `deriveOutlineItems()` / `getDocumentMetrics()` 的语义，只改变调度位置。
- PERF-003 不改变 draft sync IPC 策略；输入仍会触发现有 draft sync，留给 PERF-006。
- PERF-003 尚未让 renderer 直接消费 PERF-002 的 `outlineHeadings` projection；当前先以调度方式移出同步输入路径。

## PERF-004 已落地文件

- `packages/editor-core/src/decorations/block-decorations.ts`
  - 新增 selection-only scoped decoration path。
  - 使用 previous / next active block 收集受影响 block，并通过 `DecorationSet.update()` 只替换受影响 block span。
- `packages/editor-core/src/decorations/code-highlight.ts`
  - 增加 language alias 归一、highlight cache 读取/写入与超长 code fence fallback。
- `packages/editor-core/src/decorations/code-highlight-cache.ts`
  - 新增 code fence highlight 缓存、同步内容上限、统计与 LRU eviction。
- `packages/editor-core/src/decorations/code-highlight.test.ts`
  - 覆盖缓存命中、unknown language 与超长 code fence fallback。
- `packages/editor-core/src/extensions/markdown.ts`
  - selection-only 且 source 不变时接入 scoped decoration path。
- `packages/editor-core/src/extensions/markdown.test.ts`
  - 覆盖跨 block 与列表跨行 selection-only scoped 更新。

边界：

- PERF-004 不改变 docChanged / focus / force refresh 的 full rebuild 路径。
- PERF-004 不改变 table widget DOM contract。
- PERF-004 未做 parser lazy loading；language parser import 拆分留给 PERF-007。

## PERF-005 已落地文件

- `packages/editor-core/src/commands/list-edits.ts`
  - `computeNormalizedOrderedListDocument()` 支持 `changedRanges`。
  - 单 range 输入只解析 changed range 附近的连续非空 candidate run。
  - 多 range / 无 changed range 保留全文 fallback。
- `packages/editor-core/src/commands/list-edits.test.ts`
  - 覆盖非列表输入免 parse、空行后追加普通文本免 parse、单 root list 局部 parse、多 range fallback。
  - 覆盖 lazy continuation / plain-text tail root list 语义。
- `packages/editor-core/src/extensions/markdown.ts`
  - transaction filter 将 CodeMirror new-doc changed ranges 传入 ordered-list normalization。
- `packages/editor-core/src/extensions/markdown.test.ts`
  - 覆盖真实 EditorView 非列表输入不调用 ordered-list normalization parser。

边界：

- PERF-005 不改变 Enter / Tab / Backspace 等显式列表编辑命令的语义。
- PERF-005 对多 range paste 保留全文 fallback，不在本轮冒险做复杂局部合并。
- PERF-005 不改变 Markdown parser AST。

## PERF-006 已落地文件

- `src/renderer/editor/useWorkspaceController.ts`
  - `updateDraft()` 改为 renderer-local draft projection，不再每次输入调用 `fishmark.updateWorkspaceTabDraft()`。
  - 新增 pending draft tracking，`flushActiveWorkspaceDraft()` 在边界动作前读取最新 editor buffer 并串行 flush。
  - IPC snapshot 返回时保留同一 active tab 的本地 draft，避免旧 snapshot 覆盖新输入。
- `src/renderer/editor/useWorkspaceController.test.tsx`
  - 覆盖 100 次连续 draft update 不触发输入路径 full-content IPC，flush 时只同步最新内容。
  - 保留 tab switch、open before replace、stale snapshot preserve、失败重试等边界覆盖。
- `src/renderer/app.autosave.test.ts`
  - 更新 tab strip dirty 展示测试，确认输入后不立即 IPC。
  - 新增 dirty active tab 从 tab strip close 前先 flush，且顺序早于 `closeWorkspaceTab`。

边界：

- PERF-006 不改变 main 持有 workspace session、保存状态、路径和关闭确认的职责。
- PERF-006 不修改 preload / shared IPC contract；完整 content sync 仍使用现有 `updateWorkspaceTabDraft`，但只在动作边界执行。
- PERF-006 不改变 autosave debounce 策略，只保证 autosave 执行前 flush 最新 active editor buffer。

## PERF-007 已落地文件

- `src/renderer/editor/useEditorApplicationController.ts`
  - HTML export 逻辑改为执行 export command 时 dynamic import `../export-html`。
- `src/renderer/editor/ThemeSurfaceHost.tsx`
  - shader surface runtime 改为有 active surface 且 effects 未关闭时 dynamic import。
  - unmount / fetch failure / late import 都保留 fallback 与 disposal guard。
- `packages/editor-core/src/decorations/code-highlight-language-loader.ts`
  - 新增 code fence language parser lazy loader。
  - 负责语言 alias 归一、pending load 去重、parser-loaded listener 与测试状态清理。
- `packages/editor-core/src/decorations/code-highlight.ts`
  - 移除顶层 language parser static import。
  - parser 未加载完成时同步返回空高亮，加载后继续使用同步 parser/cache 路径。
- `packages/editor-core/src/extensions/markdown.ts`
  - editor extension 订阅 parser-loaded 事件，加载完成后通过 force refresh 重建 decorations。
- `packages/editor-core/src/decorations/code-highlight.test.ts`
  - 覆盖 lazy parser load、cache hit、unknown language 与超长 code fence fallback。
- `packages/editor-core/src/extensions/markdown.test.ts`
  - 覆盖 lazy parser chunk 加载完成后刷新 decorations。

边界：

- PERF-007 不改变 decoration 构建同步模型；parser chunk 未 ready 时只暂时不高亮。
- PERF-007 不修改 `vite.config.ts`，依赖现有 dynamic import 拆分。
- PERF-007 不改变 HTML export 输出语义，只改变加载时机。

## PERF-008 已落地文件

- `scripts/analyze-renderer-bundle.mjs`
  - 增加 `htmlInitialChunks`、静态 import 闭包推导的 `initialChunks`、`totalInitialGzipBytes` 与每 chunk source groups。
  - 增加 bundle budget flags 和 `bundleBudget=PASS/FAIL` 输出。
  - budget FAIL 时返回非 0 exit code。
- `src/main/analyze-renderer-bundle.test.ts`
  - 覆盖 JSON report、初始静态依赖闭包、budget PASS 输出和 budget FAIL exit code。
  - 覆盖 required lazy chunk 被静态拉入 first editor load 时会失败。
- `package.json`
  - `perf:bundle` 接入 budget gate。
  - budget 覆盖最大初始 chunk、首个 editor load gzip、总 JS gzip、required lazy chunks 与 forbidden initial parser source groups。
- `docs/test-report.md`
  - 增加 PERF-008 验证记录。

边界：

- PERF-008 不新增生产依赖；`npm ls --omit=dev --depth=0` 仍只有 `electron-updater`。
- PERF-008 不把耗时 benchmark 写成硬阈值；硬门槛聚焦 bundle size、首屏静态 import 边界和 parser/import 回归。

## PERF-009 已落地文件

- `packages/editor-core/src/performance/editor-performance-probe.test.ts`
  - 为长文档性能探针设置显式测试 timeout，避免全量 Vitest 并发时被默认 5s timeout 误杀。
- `src/renderer/performance/document-derived-ui.perf.test.ts`
  - 为 renderer 长文档 derived-data 性能探针设置显式测试 timeout。
- `docs/test-report.md`
  - 增加 PERF-009 最终门禁、性能专项、全量 Vitest 与真实编辑体验 probe 记录。
- `docs/decision-log.md`
  - 记录性能预算以 first editor load 静态 import 闭包作为硬门槛。
- `reports/task-summaries/editor-performance-optimization.md`
  - 新增任务总结。
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`
  - 更新最终完成度、性能数字和验证结果。
- `docs/plans/2026-05-12-editor-performance-optimization/handoff.md`
  - 增加 PERF-009 收尾 handoff。

边界：

- PERF-009 不新增编辑器功能。
- PERF-009 不把耗时数字写成跨机器硬失败门槛；硬门槛仍由 parse count、bundle budget 与 regression tests 承担。

## PERF-010 / PERF-011 列表输入与框选回归已落地文件

- `packages/editor-core/src/decorations/block-decorations.ts`
  - PERF-010 修改 active list marker 和 marker 后 padding anchor，保证 IME preedit / caret 可见。
  - PERF-010 保持当前编辑的缩进空白行不被 inactive blank-line collapse 裁掉。
- `packages/editor-core/src/decorations/block-decorations.test.ts`
  - 覆盖 active marker widget、padding anchor、嵌套空 marker Backspace 后缩进空行可见。
- `packages/editor-core/src/interactions/context.ts`
  - PERF-011 为 pointer selection 增加坐标 target fallback。
  - 在 jsdom 缺少 `elementFromPoint` 时保持 null fallback，不影响单测环境。
- `packages/editor-core/src/extensions/markdown.ts`
  - PERF-011 在 block pointer mousedown 后接管 mousemove / mouseup drag selection。
  - 保持点击列表内容后的可见文本 anchor 定位，同时允许拖拽更新 selection head。
- `packages/editor-core/src/interactions/registry.test.ts`
  - PERF-011 覆盖 document-target drag 事件通过 mock `elementFromPoint` 回到实际 `.cm-line`。
- `src/renderer/markdown-editing-experience-probe.ts`
  - PERF-010 覆盖裸 marker、`- ` / `1. ` 提交后 IME、逐字符列表输入、嵌套空 marker Backspace caret。
  - PERF-011 覆盖无序、有序、task、嵌套列表 visible content 拖拽框选。
- `src/renderer/list-geometry-probe.ts`
  - 覆盖 active/inactive list content、marker 和缩进空白行几何。
- `src/renderer/styles/markdown-render.css`
  - PERF-010 调整 active list marker / padding anchor 的可见性与布局抵消。
- `docs/test-report.md`
  - 记录 list input 与 list selection 两轮回归验证。
- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
  - 增加 PERF-011 验收任务。
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`
  - 记录 PERF-011 执行和验收状态。

边界：

- PERF-010 / PERF-011 只修复列表输入、caret、IME 与选择行为，不改变 Markdown 源码真相。
- 不改变 table widget DOM contract。
- 不改变 list parser 语义之外的 Markdown block 解析。

## 预计修改文件总览

### 根目录与构建脚本

- `package.json`
  - 增加 `perf:baseline`、`perf:bundle` 等脚本。
  - 不在性能任务中新增无关产品脚本。
- `package-lock.json`
  - 只因依赖调整或脚本相关 package 变化而更新。
- `vite.config.ts`
  - 仅在 PERF-007 / PERF-008 需要明确 chunk 边界或 bundle budget 时修改。
- `scripts/analyze-renderer-bundle.mjs`
  - 新增。负责读取 `dist/assets` 和 sourcemap / manifest，输出 chunk size 与 package group 报告。

边界：

- 不修改 `electron-builder.json`。
- 不修改 release 脚本。
- 不修改图标、品牌、站点发布文件。

### Markdown engine

预计不优先修改：

- `packages/markdown-engine/src/parse-markdown-document.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/parse-inline-ast.ts`

只有当 PERF-002 需要暴露 reference definitions 或 parser instrumentation 时，才允许做小接口扩展。

边界：

- 不改变 Markdown AST 语义。
- 不改变现有 table/list/blockquote/image 解析结果。
- 不为性能任务引入新 Markdown 语法。

### Editor core derived state

- `packages/editor-core/src/derived-state/markdown-document-cache.ts`
  - PERF-002 修改。升级缓存职责，避免同一事务多次 parse。
- `packages/editor-core/src/derived-state/block-map-cache.ts`
  - PERF-002 可能修改。若保留，需与新的 `EditorDerivedState` 不重复。
- `packages/editor-core/src/derived-state/inactive-block-decorations.ts`
  - PERF-002 / PERF-004 修改。改为接收统一 derived state 或 scoped decoration input。
- `packages/editor-core/src/derived-state/editor-derived-state.ts`
  - PERF-002 新增。统一承载 Markdown document、active block、table cursor、reference definitions 等派生状态。
- `packages/editor-core/src/derived-state/editor-derived-state.test.ts`
  - PERF-002 新增。覆盖 parse 次数、selection-only 更新、cache invalidation。

边界：

- `markdown-engine` 不 import `@codemirror/*`。
- derived state 可以依赖 `markdown-engine` 类型，但不能依赖 renderer React。

### Editor core extension

- `packages/editor-core/src/extensions/markdown.ts`
  - PERF-002 修改 derived state 入口。
  - PERF-005 修改 ordered-list normalization 的触发范围。
  - PERF-004 修改 recompute/decorations 更新策略。
- `packages/editor-core/src/extensions/markdown.test.ts`
  - 覆盖输入、selection、composition、hidden marker、table focus、list normalization 回归。
- `packages/editor-core/src/extensions/markdown-shortcuts.ts`
  - 原则上不修改；只有 shortcut group 依赖 active block shape 变化时允许调整。

边界：

- 不新增 UI 行为。
- 不绕过 IME composition guard。
- 不把 renderer 状态写进 editor-core。

### Editor core decorations

- `packages/editor-core/src/decorations/block-decorations.ts`
  - PERF-004 修改。拆分签名、缩小 rebuild 范围。
  - PERF-010 修改 active list marker：marker 源码改由 generated marker widget 呈现，marker 后空格使用可见 caret anchor，并用 CSS 负 margin 避免 active/inactive 内容偏移，同时避免 IME preedit 文本继承透明色。
- `packages/editor-core/src/decorations/code-highlight.ts`
  - PERF-004 / PERF-007 修改。加入缓存或 lazy parser loader。
- `packages/editor-core/src/decorations/code-highlight-cache.ts`
  - PERF-004 可能新增。负责 code fence highlight 缓存。
- `packages/editor-core/src/decorations/code-highlight-language-loader.ts`
  - PERF-007 可能新增。负责按 fence language lazy load parser。
- `packages/editor-core/src/decorations/block-decorations.test.ts`
  - 覆盖 decoration signature 与 scoped refresh。
  - 覆盖 active marker widget、嵌套 list source prefix 与 marker 后可编辑 padding。
- `packages/editor-core/src/decorations/code-highlight.test.ts`
  - 覆盖 cache hit、unknown language、超长 code fence fallback。
- `packages/editor-core/src/decorations/table-widget.ts`
  - 原则上不修改；只有 scoped decoration 与 table widget cursor 输入接口冲突时才调整。

边界：

- 不改变 Markdown 源码态和非激活态视觉语义。
- 不改变 table editing DOM contract，除非有对应 renderer 测试覆盖。

### Editor core commands

- `packages/editor-core/src/commands/list-edits.ts`
  - PERF-005 修改。ordered-list normalization 从全文改为 changed root list 范围。
- `packages/editor-core/src/commands/list-edits.test.ts`
  - 覆盖局部 normalization 与 paste fallback。
- `packages/editor-core/src/commands/table-context.ts`
  - 原则上不修改；只有 derived state 接口变化导致读取路径调整时才触碰。
- `packages/editor-core/src/commands/semantic-context.ts`
  - 原则上不修改。

边界：

- 不改变列表编辑可见行为。
- 不牺牲最小 diff 提交原则。

### Renderer editor adapter

- `src/renderer/code-editor.ts`
  - PERF-002 / PERF-004 / PERF-007 可能修改。承接 editor-core derived state、search、lazy highlighter 的接入点。
- `src/renderer/code-editor-view.tsx`
  - PERF-007 可能修改。空工作区 lazy load 或 editor controller lifecycle 调整。
- `src/renderer/code-editor.test.ts`
  - 覆盖 editor controller 行为、search、replace、content access。
  - PERF-010 覆盖 active list generated marker 与 marker 后可编辑输入语义。
- `src/renderer/code-editor-view.test.tsx`
  - 覆盖 React wrapper lifecycle。

边界：

- `CodeEditorView` 仍是 renderer 使用 CodeMirror 的主要适配层。
- 不让 `WorkspaceShell` 直接操作 CodeMirror internals。

### Renderer shell and workflows

- `src/renderer/editor/App.tsx`
  - PERF-003 修改 metrics/outline 同步路径。
  - PERF-007 可能修改 lazy editor / lazy surface 入口。
- `src/renderer/editor/useEditorWorkflowController.ts`
  - PERF-003 修改 outline/metrics scheduling。
  - PERF-006 修改 draft sync policy。
- `src/renderer/editor/useWorkspaceController.ts`
  - PERF-006 修改 flush / draft sync queue。
- `src/renderer/editor/useSaveController.ts`
  - PERF-006 验证 save/autosave 前 flush 最新内容。
- `src/renderer/editor/useEditorApplicationController.ts`
  - PERF-007 修改 HTML export dynamic import。
- `src/renderer/editor/WorkspaceShell.tsx`
  - 原则上不修改；只有 UI props 从 metrics/outline 派生方式变化时做最小调整。
- `src/renderer/editor/TitlebarHost.tsx`
  - PERF-007 可能修改，避免 titlebar surface runtime 进入首屏。
- `src/renderer/editor/ThemeSurfaceHost.tsx`
  - PERF-007 修改 shader runtime lazy load。

测试：

- `src/renderer/editor/useEditorApplicationController.test.tsx`
- `src/renderer/editor/useWorkspaceController.test.tsx`
- `src/renderer/editor/useSaveController.test.tsx`
- `src/renderer/editor/WorkspaceShell.test.tsx`
- `src/renderer/app.autosave.test.ts`

边界：

- `WorkspaceShell` 保持 presentation-only。
- App 只做 composition / orchestration，不重新堆业务流程。
- 不改设置抽屉结构，不改视觉主题。

### Renderer derived UI data

- `src/renderer/outline.ts`
  - PERF-003 修改。支持从 derived state projection 生成 outline，或保留纯函数但不在 keypress 同步调用。
- `src/renderer/outline.test.ts`
  - 覆盖 heading label 与 fallback。
- `src/renderer/document-metrics.ts`
  - PERF-003 修改。减少重复 parse，必要时提供基于 derived state 的 metrics reader。
- `src/renderer/document-metrics.test.ts`
  - 覆盖 readable text 与长文档路径。
- `src/renderer/theme-runtime-env.ts`
  - 原则上不修改；只有 wordCount 更新策略需要类型补充时调整。

边界：

- metrics 变化只能影响显示和主题 env，不影响保存内容。
- outline navigation offset 必须继续指向原 Markdown 文本。

### Renderer export and theme runtime

- `src/renderer/export-html.ts`
  - PERF-007 不一定修改文件内容，但 import 方式要从首屏静态 import 改为 dynamic import。
- `src/renderer/export-html.test.ts`
  - 验证 dynamic import 后导出行为不变。
- `src/renderer/shader/theme-surface-runtime.ts`
  - 原则上不修改；优先通过 lazy import 避免首屏加载。
- `src/renderer/shader/theme-scene-state.ts`
  - 原则上不修改。
- `src/renderer/editor/ThemeSurfaceHost.test.tsx`
  - 覆盖 lazy mount、fallback、unmount。

边界：

- 不改变主题 package manifest contract。
- 不让主题包执行任意脚本。

### Main / preload / shared workspace sync

- `src/shared/workspace.ts`
  - PERF-006 可能修改。若新增 draft sync policy 类型，必须保持 typed IPC contract。
- `src/preload/preload.ts`
  - PERF-006 可能修改。暴露最小新增 bridge 或调整现有 draft sync 调用。
- `src/preload/preload.contract.test.ts`
  - PERF-006 必改。保证 bridge contract 收缩或变更有测试。
- `src/main/main.ts`
  - PERF-006 可能修改 IPC handler。
- `src/main/workspace-application.ts`
  - PERF-006 修改 save 前读取最新 draft 的方式。
- `src/main/workspace-service.ts`
  - PERF-006 修改 draft/session 状态或 snapshot content 策略。
- `src/main/workspace-service.test.ts`
  - 覆盖 dirty、lastSavedContent、snapshot、tab switch。
- `src/main/workspace-application.test.ts`
  - 覆盖 save 使用最新 content。

边界：

- main 继续负责文件系统和高权限操作。
- preload 不暴露 unrestricted Node API。
- renderer 不直接读写本地文件。
- 外部文件冲突、保存、关闭确认必须保持原有安全语义。

### Performance tests and scenarios

- `packages/editor-core/src/performance/long-document-fixtures.ts`
  - PERF-001 新增。
- `packages/editor-core/src/performance/editor-derived-state.perf.test.ts`
  - PERF-001 / PERF-002 新增。
- `src/renderer/performance/document-derived-ui.perf.test.ts`
  - PERF-001 / PERF-003 新增。
- `packages/test-harness/src/scenarios/long-document-editing.ts`
  - PERF-009 可能新增。
- `packages/test-harness/src/scenarios/index.ts`
  - PERF-009 可能修改以注册场景。

边界：

- 性能测试应可在本地稳定运行，不依赖外部网络。
- 若某项只能作为人工 benchmark，必须在 `progress.md` 标记为 manual evidence，不可伪装成自动门禁。

### 项目记录

- `docs/test-report.md`
  - PERF-009 必改。记录最终验证命令和性能数字。
- `docs/decision-log.md`
  - PERF-006 / PERF-007 如果改变架构边界，必须补记录。
- `reports/task-summaries/editor-performance-optimization.md`
  - PERF-009 新增。

边界：

- 不改 `MVP_BACKLOG.md`，除非用户决定把本优化正式纳入 backlog task。
- 不改全局 `docs/progress.md`，除非任务进入正式项目状态表。

## 明确不触碰的文件

除非用户后续改变范围，本优化任务不应修改：

- `electron-builder.json`
- `scripts/build-mac-release.mjs`
- `scripts/build-win-release.mjs`
- `site/`
- `build/icons/`
- `src/renderer/theme-packages/default/manifest.json`
- `src/renderer/theme-packages/default/styles/*`
- `src/renderer/theme-packages/default/tokens/*`

## 分支与脏工作区注意

当前工作区已有未提交改动，涉及：

- `package.json`
- `package-lock.json`
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor-view.tsx`
- `src/renderer/document-metrics.ts`
- `src/renderer/editor/WorkspaceShell.tsx`
- 多个 renderer tests 与 CSS 文件

后续实现性能任务时必须先确认这些改动是否属于正在进行的查找替换/编辑器 UI 工作，不得回退或覆盖。
