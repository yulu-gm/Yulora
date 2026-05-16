# Editor Performance Optimization Route Map

## 任务目标

围绕当前编辑器实现的性能风险做一轮生产级重构规划，目标覆盖三条线：

- 启动速度：降低空工作区、打开窗口、打开普通文档时的首屏 JS 和同步初始化成本。
- runtime 编辑速度：让 5000 行以上 Markdown 文档在输入、移动光标、滚动、查找、保存时保持可用，不因全量 parse、全量 decoration、全量 IPC 复制造成明显卡顿。
- 包体与 runtime import：把非首屏、非默认路径、低频功能拆出 editor 主 chunk，建立 bundle budget。

非目标：

- 不替换 Electron / React / TypeScript / CodeMirror 6 / micromark / Vite / Vitest / Playwright。
- 不改变 Markdown round-trip 语义。
- 不借性能优化顺手新增 Markdown 语法或 UI 功能。
- 不重做主题系统、导出系统、workspace 产品形态，只收敛性能边界。

## 当前证据

本计划基于 2026-05-12 的静态审查、`npm run build` 与 PERF-001 基线结果：

- `dist/assets/App-DiXmtmhR.js` 为 791.54 kB，gzip 257.75 kB，Vite 报告 editor chunk 超过 500 kB。
- `npm run perf:baseline` 报告 renderer JS 总量 1,002,562 bytes，gzip 318,990 bytes；editor chunk 791,582 bytes，gzip 252,547 bytes。
- 每次 `docChanged` 会多次 `state.doc.toString()`，并触发 Markdown 派生状态、outline、metrics、workspace draft sync。
- selection-only 更新也会进入 `recomputeDerivedState`，重建 block decorations，并在 `createBlockDecorations` 内遍历全文 blocks。
- `computeNormalizedOrderedListDocument(source)` 当前对整篇文档 `parseBlockMap(source)`；PERF-001 基线显示一次普通输入和一次 ordered-list edit 各触发 `parseMarkdownDocument=1` 与 `parseBlockMap=1`。
- `updateWorkspaceTabDraft` 每次输入都会向 main 发送完整 content，main 再返回完整 active document snapshot。
- `code-highlight.ts` 顶层 import 多个 CodeMirror/Lezer language parser，直接进入 editor 主 chunk。

## 总体执行原则

- 先建立可重复测量，再改实现。没有基线数字的优化不算完成。
- 每个任务只改变一类性能边界，并保留现有行为测试。
- 所有 parser / decoration / IPC 优化必须证明不破坏保存、autosave、tab switch、window close、外部文件冲突保护。
- 每个任务完成后更新本文件夹的 `progress.md`，并在需要时更新 `docs/test-report.md`。

## 任务拆分

### PERF-001 建立性能基线与预算

状态：PASS

目标：先把长文档编辑、parse 次数、bundle size 变成可重复验证的指标。

主要落点：

- 新增 `packages/editor-core/src/performance/`
- 新增 `src/renderer/performance/`
- 新增 `scripts/analyze-renderer-bundle.mjs`
- 修改 `package.json`

执行步骤：

1. 新增长文档 fixture builder，至少生成三类 Markdown：
   - 5000 行纯段落
   - 5000 行混合标题、列表、引用、代码块
   - 含 100 个 fenced code block 的文档
2. 增加 editor-core 性能探针测试，能统计一次输入、一次 selection move、一次 ordered-list edit 中 parser 调用次数。
3. 增加 renderer 层性能测试，覆盖 `deriveOutlineItems` 与 `getDocumentMetrics` 对长文档的调用路径。
4. 增加 bundle 分析脚本，输出：
   - renderer 总 JS
   - editor 主 chunk
   - React chunk
   - lazy chunks
   - top 20 sources 或 package groups
5. 在 `package.json` 增加可直接运行的性能检查脚本。

验收标准：

- `npm run perf:baseline` 可以在本机稳定输出指标报告。
- 报告至少包含 parse count、长文档输入耗时、长文档 selection update 耗时、bundle chunk size。
- `npm run test -- packages/editor-core/src/performance src/renderer/performance src/main/analyze-renderer-bundle.test.ts` 通过。
- `npm run build` 通过。
- 该任务不改变用户可见行为。

### PERF-002 建立统一 EditorDerivedState

状态：PASS
依赖：PERF-001

目标：把当前分散在 editor extension、outline、metrics、decorations 的 Markdown parse 入口收敛为一个可复用的派生状态层。

主要落点：

- 新增 `packages/editor-core/src/derived-state/editor-derived-state.ts`
- 修改 `packages/editor-core/src/extensions/markdown.ts`
- 修改 `packages/editor-core/src/derived-state/markdown-document-cache.ts`
- 修改 `packages/editor-core/src/derived-state/inactive-block-decorations.ts`

执行步骤：

1. 定义 `EditorDerivedState`，至少包含：
   - `source`
   - `markdownDocument`
   - `activeBlockState`
   - `tableCursor`
   - `referenceDefinitions`
   - `outlineItems` 的原始 heading 数据或可供 renderer 派生的 heading projection
2. 将 `markdownDocumentCache.read(source)` 升级为同一事务内只 parse 一次。
3. 让 `deriveInactiveBlockDecorationsState` 接收已计算的 `EditorDerivedState`，而不是自行读取 cache。
4. 保留 `parseMarkdownDocument` 作为 markdown-engine 的纯函数，不把 CodeMirror 类型泄漏进 `markdown-engine`。
5. 增加 parse spy 测试，证明单次 docChanged 不会触发多份 Markdown document parse。

验收标准：

- `npm run test -- packages/editor-core/src/derived-state packages/editor-core/src/extensions/markdown.test.ts` 通过。
- 对一次普通字符输入，Markdown document parse 次数不超过 1 次。
- 对一次 selection-only update，不重新 parse Markdown document。
- active block、table cursor、inactive decoration 现有行为测试不回退。

### PERF-003 将 outline 与 metrics 移出同步输入路径

状态：PASS
依赖：PERF-002

目标：输入字符时不再立即在 React shell 中全量 parse outline 和 metrics，也不在 render 阶段同步计算 metrics。

主要落点：

- 修改 `src/renderer/editor/App.tsx`
- 修改 `src/renderer/editor/useEditorWorkflowController.ts`
- 修改 `src/renderer/outline.ts`
- 修改 `src/renderer/document-metrics.ts`
- 新增或修改对应测试

执行步骤：

1. 将 outline 更新改为使用 PERF-002 暴露的 heading projection，或改为 idle/debounce 任务。
2. 将 `getDocumentMetrics(currentDocumentContent)` 从 render 同步路径移出，改为基于内容版本的 memo/idle update。
3. 为 metrics 增加长文档测试，避免表格、代码块、引用块重复 parse。
4. 确保主题 runtime 的 `wordCount` 更新可以延迟，但不会永久过期。

验收标准：

- 普通输入路径不直接调用 `deriveOutlineItems(content)`。
- `App` render 不直接调用 `getDocumentMetrics(fullContent)`。
- 长文档输入测试中，outline/metrics 不阻塞每次 keypress。
- `npm run test -- src/renderer/outline.test.ts src/renderer/document-metrics.test.ts src/renderer/app.autosave.test.ts` 通过。

### PERF-004 收敛 decoration 与代码块高亮重建范围

状态：PASS
依赖：PERF-002

目标：selection-only 更新不重建全篇 decoration；代码块高亮只处理必要块，并缓存 parser/highlight 结果。

主要落点：

- 修改 `packages/editor-core/src/decorations/block-decorations.ts`
- 修改 `packages/editor-core/src/decorations/code-highlight.ts`
- 新增 `packages/editor-core/src/decorations/code-highlight-cache.ts`
- 修改 `packages/editor-core/src/derived-state/inactive-block-decorations.ts`

执行步骤：

1. 将 block decoration signature 拆成 document structure signature、active block signature、table cursor signature。
2. 对 selection-only 且 active block 未跨块变化的更新，只映射已有 DecorationSet 或只刷新 active block 相关 ranges。
3. 对 fenced code block 高亮增加基于 `language + code content hash/range` 的缓存。
4. 为超长代码块设置同步高亮上限，超过上限时只保留 code block 基础样式。
5. 用现有 rendering tests 验证 headings、paragraph、list、blockquote、codeFence、table、image 均不回退。

验收标准：

- selection-only update 不遍历全文 blocks 构建 decoration。
- 代码块高亮同一内容重复 selection move 时命中缓存。
- 超长 code fence 不会同步 parse 整段高亮导致输入阻塞。
- `npm run test -- packages/editor-core/src/decorations packages/editor-core/src/extensions/markdown.test.ts` 通过。

### PERF-005 缩小 ordered-list normalization 范围

状态：PASS
依赖：PERF-001

目标：ordered-list 自动归一化不再对每次 `docChanged` 全文 `parseBlockMap(source)`。

主要落点：

- 修改 `packages/editor-core/src/extensions/markdown.ts`
- 修改 `packages/editor-core/src/commands/list-edits.ts`
- 修改 `packages/editor-core/src/commands/list-edits.test.ts`

执行步骤：

1. 从 CodeMirror `transaction.changes` 解析 changed ranges。
2. 只定位 changed range 附近的 root list block。
3. 对目标 root list 执行 normalization，并生成最小 text changes。
4. 对多 range paste 保留安全 fallback，但 fallback 必须有测试和性能预算说明。
5. 覆盖有序列表插入、删除、缩进、反缩进、跨列表 paste 的行为测试。

验收标准：

- 单字符输入非列表块时不触发全文 `parseBlockMap`。
- 列表块内输入只 normalize 当前 root list。
- 现有 ordered-list 语义测试全部通过。
- 长文档中在非列表段落输入时，ordered-list normalization 耗时接近 0。

### PERF-006 重构 renderer 到 main 的 draft sync 策略

状态：PASS
依赖：PERF-001

目标：停止每次输入都通过 IPC 发送整篇文档，同时保留 main 持有 workspace session、保存、关闭确认与外部冲突保护的现有职责边界。

主要落点：

- 修改 `src/renderer/editor/useWorkspaceController.ts`
- 修改 `src/renderer/editor/useWorkspaceController.test.tsx`
- 修改 `src/renderer/app.autosave.test.ts`

说明：最终实现没有改 main / preload / shared contract；保留现有 `updateWorkspaceTabDraft` IPC contract，只把调用时机从每次输入移到 save/autosave/tab switch/close/open/window close 等边界前 flush。

执行步骤：

1. 定义 draft sync policy：
   - renderer 的 CodeMirror doc 是当前活动 tab 的 live editable text。
   - main 的 workspace session 仍是 tab 列表、保存状态、路径、lastSavedContent、关闭确认的 owner。
   - renderer 在 autosave/save/tab switch/window close/open before replace 等边界前 flush 完整 draft。
   - 输入过程中只更新 renderer 本地 dirty snapshot 或发送节流后的 draft metadata。
2. 保留现有 `flushActiveWorkspaceDraft()` 语义，但让它成为边界动作，而不是每 keypress 的普通路径。
3. 让 `updateDraft` 支持 debounce 或 dirty marker，不再每次输入立即 IPC 完整 content。
4. 确认所有打开、关闭、保存、另存为、窗口关闭、外部文件冲突路径在动作前都会 flush 最新 editor content。
5. 增加 IPC 调用次数测试，证明连续输入 N 次不会触发 N 次完整 draft sync。

验收标准：

- 连续输入 100 个字符时，`updateWorkspaceTabDraft` 完整 content IPC 调用次数显著小于 100，理想为 0 或按 debounce 合并。
- Save / Autosave / Save As 写入的是最新 editor content。
- Tab switch、close tab、window close、open new file 前不会丢失未 flush 内容。
- `npm run test -- src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useSaveController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/main/workspace-application.test.ts src/main/workspace-service.test.ts src/preload/preload.contract.test.ts` 通过。

### PERF-007 拆分低频 runtime import 与 editor 主 chunk

状态：PASS
依赖：PERF-001

目标：降低启动和首个 editor chunk。把低频功能从 `App` chunk 移出，尤其是 export-html、shader runtime、code fence language parsers。

主要落点：

- 修改 `src/renderer/editor/useEditorApplicationController.ts`
- 修改 `src/renderer/editor/ThemeSurfaceHost.tsx`
- 修改 `packages/editor-core/src/decorations/code-highlight.ts`
- 新增 `packages/editor-core/src/decorations/code-highlight-language-loader.ts`
- 修改 `packages/editor-core/src/extensions/markdown.ts`

说明：最终不需要修改 `TitlebarHost.tsx` 或 `vite.config.ts`；Vite/Rolldown 自动基于 dynamic import 拆分出 export-html、shader runtime 与 language parser chunks。

执行步骤：

1. 将 HTML export 改为点击导出时 dynamic import `../export-html`。
2. 将 `ThemeSurfaceHost` 或 `createThemeSurfaceRuntime` 改为只有 active surface 存在时加载。
3. 将 code fence language parsers 改为按语言懒加载或拆分 parser registry。
4. 评估是否将 `CodeEditorView` 在无 active document 的空工作区中 lazy load。
5. 如 Vite/Rolldown 自动拆分不足，再通过输出配置明确 chunk 边界。

验收标准：

- 空工作区首屏不加载 export-html 和 shader runtime。
- 默认无代码块文档不加载 JS/Python/HTML/CSS language parser。
- `npm run build` 中最大 editor 主 chunk 低于当前 791.54 kB，目标低于 500 kB；若因 CodeMirror core 仍超过阈值，必须在 `progress.md` 记录剩余来源。
- HTML export、主题 surface、代码块高亮行为测试通过。

### PERF-008 建立 bundle 和 dependency budget

状态：PASS
依赖：PERF-007

目标：防止包体优化回退，并明确 runtime dependencies 与 devDependencies 的边界。

主要落点：

- 修改 `package.json`
- 修改 `scripts/analyze-renderer-bundle.mjs`
- 修改 `src/main/analyze-renderer-bundle.test.ts`
- 修改 `docs/test-report.md` 记录项

说明：没有引入或移动依赖，因此不修改 `package-lock.json`。

执行步骤：

1. 为 renderer bundle 设置 budget：
   - 最大单个首屏 chunk
   - 最大总 gzip JS
   - 低频 lazy chunk 不计入首屏 budget，但仍记录。
2. 将 bundle 分析脚本接入 `npm run build` 后可独立运行的检查命令。
3. 检查 runtime package：
   - Electron main 生产依赖保持最小。
   - renderer bundled packages 记录在 bundle report，不因为在 devDependencies 就忽略体积。
4. 移除未使用 runtime imports 或重复语言 parser。

验收标准：

- `npm run perf:bundle` 输出 PASS / FAIL。
- `npm ls --omit=dev --depth=0` 仍只包含必要生产依赖，除非有明确 release 理由。
- bundle budget 失败会让后续优化任务不能判完成。

### PERF-009 长文档最终验收与收尾

状态：PASS
依赖：PERF-002 至 PERF-008

目标：把重构后的编辑体验、启动成本、包体结果做整体验收，形成可维护的长期基线。

主要落点：

- 修改 `docs/test-report.md`
- 修改 `docs/decision-log.md`
- 新增 `reports/task-summaries/editor-performance-optimization.md`
- 更新本文件夹 `progress.md`

执行步骤：

1. 跑完整质量门禁：
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
2. 跑性能专项：
   - `npm run perf:baseline`
   - `npm run perf:bundle`
   - 长文档 editor-core / renderer tests
3. 跑相关功能回归：
   - editor-core markdown extension
   - list edits
   - workspace/save/autosave
   - HTML export
   - theme surface fallback
4. 记录优化前后对比。
5. 写任务总结和人工验收步骤。

验收标准：

- 5000 行以上 Markdown 文档输入和 selection move 无明显卡顿，性能报告记录具体数字。
- build/lint/typecheck 通过。
- 相关测试通过。
- bundle 主 chunk 和 parser/import 风险有明确结果。
- 文档记录完整，可供后续任务复核。

### PERF-010 列表 marker 输入回归收口

状态：PASS
依赖：PERF-009

目标：修复性能重构后人工试用发现的列表 marker 输入体验回归，确保 `- ` / `1. ` 提交列表后，IME composition 和后续文本都以 marker 后的真实光标位置为锚点。

主要落点：

- 修改 `packages/editor-core/src/decorations/block-decorations.ts`
- 修改 `src/renderer/markdown-editing-experience-probe.ts`
- 修改 `packages/editor-core/src/decorations/block-decorations.test.ts`
- 修改 `src/renderer/code-editor.test.ts`
- 修改 `docs/test-report.md`

执行步骤：

1. 用真实 Electron/Chromium probe 覆盖 `-` 后输入空格再开始 composition 的路径。
2. 将 active list marker 改为 generated marker widget，只隐藏 marker 源码本身。
3. 将 marker 后空格保留为可编辑 caret anchor：必须有实际宽度、`overflow: visible`、非透明 `caret-color` 与非透明 text color，并通过负 margin 抵消布局宽度，避免 DOM selection 落入隐藏 source-prefix、IME preedit 文本被透明样式隐藏，或 active/inactive 内容偏移。
4. 更新结构测试和 renderer 行为测试。
5. 覆盖嵌套列表 Enter 自动创建空 marker 后 Backspace 留下缩进空行的 caret 可见性，确保当前编辑的缩进空行不被 0 高度 blank-line collapse 裁掉。
6. 重跑列表输入相关 Vitest、编辑体验 probe、typecheck、lint、build 与 diff check。

验收标准：

- 裸 `-` / `1.` / `1)` 仍保持 paragraph，输入空格后才提交列表 marker。
- `- ` 提交 marker 后，DOM selection 有有效 range rect，且 anchor 不在 `.cm-active-list-source-prefix` 或 0 宽隐藏节点。
- composition preview / IME preedit 与后续文本保持在 marker 后同一行且可见。
- 嵌套列表空 marker Backspace 后，包含缩进空格且正在编辑的空白行有可见行高，caret rect 落在该行内；纯结构性空行仍保持折叠。
- active/inactive list content 与 marker 几何 delta 保持在 1px 容差内。
- 空 marker Backspace 和嵌套 marker Backspace 逻辑不回退。
- `npm run test:editing-experience`、相关 Vitest、typecheck、lint、build、`git diff --check` 均通过。

### PERF-011 列表内容框选回归收口

状态：PASS
依赖：PERF-010

目标：修复列表 marker 输入修复后暴露的列表内容拖拽框选回归，同时保持点击列表内容后继续输入、IME 与 marker 点击定位不回退。

主要落点：

- 修改 `packages/editor-core/src/extensions/markdown.ts`
- 修改 `packages/editor-core/src/interactions/context.ts`
- 修改 `src/renderer/markdown-editing-experience-probe.ts`
- 修改 `docs/test-report.md`
- 修改本文件夹 `progress.md` / `file-tree.md`

执行步骤：

1. 用真实 Electron/Chromium probe 先复现列表内容 drag selection 被折叠到内容起点的问题。
2. 保留 block pointer mousedown 的 source mapping，但在自定义 pointer selection 上补齐 mousemove / mouseup drag tracking。
3. mousemove / mouseup 使用当前坐标重新解析可见文本 head；事件 target 不在 `.cm-line` 时，通过 `elementFromPoint` 做浏览器坐标兜底。
4. 对 jsdom 缺少 `elementFromPoint` 的测试环境做能力检测，避免 table / image / generic click 回归。
5. 补充无序、有序、task、嵌套列表内容拖拽选择 probe。
6. 重跑编辑体验 probe、list geometry、相关 Vitest、typecheck、lint、build 与 diff check，并交给 subagent 验收。

验收标准：

- 列表内容从 visible text 内拖拽可选中实际内容，不再只折叠到起点。
- 无序、有序、task、嵌套列表都被真实 Electron/Chromium probe 覆盖。
- 原有列表点击后继续输入不回归。
- marker / 左侧缩进点击仍能映射回 Markdown 源码 marker 位置。
- jsdom 单测环境没有 `elementFromPoint` 时不抛错、不影响表格点击测试。
- `npm run test:editing-experience`、`npm run test:list-geometry`、相关 Vitest、typecheck、lint、build、`git diff --check` 均通过。

## 最终完成定义

本优化任务全部完成需要同时满足：

- PERF-001 到 PERF-011 均完成。
- `npm run build`、`npm run lint`、`npm run typecheck` 通过。
- 相关 Vitest / scenario / performance tests 通过。
- 5000 行长文档基线达成，且指标写入 `docs/test-report.md`。
- 不破坏 Markdown 文本唯一事实来源和 round-trip 保真。
- 不引入新的无界 Node API 或 renderer 高权限路径。
