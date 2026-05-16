# Editor Performance Optimization Progress

## 当前状态

状态：PASS

最后更新：2026-05-12

本任务已完成并通过验收 `PERF-001` 至 `PERF-009`。

当前规划文件：

- `docs/plans/2026-05-12-editor-performance-optimization/route-map.md`
- `docs/plans/2026-05-12-editor-performance-optimization/file-tree.md`
- `docs/plans/2026-05-12-editor-performance-optimization/progress.md`
- `docs/plans/2026-05-12-editor-performance-optimization/handoff.md`

## 总体进度

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| 规划文档 | DONE | route-map、file-tree、progress 已创建。 |
| PERF-001 性能基线与预算 | PASS | 已新增长文档 fixture、editor-core probe、renderer derived-data probe、bundle analyzer 与 `perf:baseline`，subagent 验收通过。 |
| PERF-002 统一 EditorDerivedState | PASS | 已新增 `EditorDerivedState`，将 Markdown document、active block、table cursor、reference definitions 与 heading projection 统一到单次派生状态，并通过 spec / code quality subagent 验收。 |
| PERF-003 outline / metrics 异步化 | PASS | 已新增 renderer derived-data controller，输入路径只调度 outline / metrics，文档打开路径保留立即可用数据，并通过 spec / code quality subagent 验收。 |
| PERF-004 decoration / code highlight scoped rebuild | PASS | selection-only 更新已走 scoped decoration path；code fence highlight 已增加缓存和超长 fallback，并通过 spec / code quality subagent 验收。 |
| PERF-005 ordered-list normalization 范围收缩 | PASS | 单 range 输入按 changed range 附近 root list 局部 normalize；非列表输入不再触发 ordered-list `parseBlockMap`；多 range 保留全文 fallback，并通过 spec / code quality subagent 验收。 |
| PERF-006 draft sync IPC 策略重构 | PASS | 输入路径不再每次发送完整 content IPC；save/autosave/tab switch/close/open/window close 边界前 flush 最新 active editor buffer，并通过 spec / code quality subagent 验收。 |
| PERF-007 runtime import / chunk 拆分 | PASS | export-html、theme surface runtime 与 code fence language parsers 已从 editor 主 chunk 拆出，并通过 spec / code quality subagent 验收。 |
| PERF-008 bundle / dependency budget | PASS | `perf:bundle` 已输出 `bundleBudget=PASS/FAIL`，budget 失败会非 0 退出；生产依赖边界仍只有 `electron-updater`。 |
| PERF-009 最终长文档验收 | PASS | 最终质量门禁、性能专项、相关回归、全量 Vitest、空文档布局 probe 与真实编辑体验 probe 均通过；文档与任务总结已更新。 |

总体完成度：100%

说明：100% 代表规划、基线工具、editor-core 派生状态、renderer outline/metrics 调度、decoration scoped rebuild、code highlight 缓存、ordered-list normalization 范围收缩、draft sync IPC 策略重构、runtime import/chunk 拆分、bundle budget gate 与最终长文档验收均已完成。

## 已确认的问题清单

- editor 主 chunk 已从 PERF-006 的 `App-CJMN5Qc1.js` 797.45 kB / gzip 254.25 kB 降至 `App-DlTYTB36.js` 229.68 kB / gzip 63.74 kB。
- `docChanged` 路径已通过统一 `EditorDerivedState`、derived-data 调度和 scoped decoration 收敛主要重复 parse / rebuild 风险；后续可继续优化 `state.doc.toString()` 复制成本。
- ordered-list normalization 多 range paste 仍保留全文 fallback。
- outline 与 metrics 已移出 keypress 同步路径；算法本身仍是长文档成本中心，当前通过调度避免阻塞输入。
- draft sync 输入路径已不再每次向 main 传完整 content；完整 sync 收敛到 save/autosave/tab switch/close/open/window close 等边界。
- code fence language parsers 已改为按语言 lazy load；`perf:bundle` 会阻止 JS/Python/HTML parser source groups 回到首个 editor load 静态闭包。

## 当前验证证据

已执行：

```bash
npm run build
npm run test -- packages/editor-core/src/performance src/renderer/performance src/main/analyze-renderer-bundle.test.ts
npm run perf:baseline
npm run typecheck
npm run lint
npm run test -- packages/editor-core/src/derived-state packages/editor-core/src/extensions/markdown.test.ts
npm run test -- packages/editor-core/src/decorations packages/editor-core/src/derived-state packages/editor-core/src/extensions/markdown.test.ts
npm run test -- packages/markdown-engine
npm run test -- src/renderer/editor/useDocumentDerivedDataController.test.tsx src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/outline.test.ts src/renderer/document-metrics.test.ts src/renderer/app.autosave.test.ts
npm run test -- packages/editor-core/src/decorations packages/editor-core/src/extensions/markdown.test.ts
npm run test -- packages/editor-core/src/commands/list-edits.test.ts
npm run test -- packages/editor-core/src/commands packages/editor-core/src/extensions/markdown.test.ts packages/editor-core/src/performance/editor-performance-probe.test.ts
npm run test -- src/renderer/editor/useWorkspaceController.test.tsx src/renderer/app.autosave.test.ts
npm run test -- src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useSaveController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/main/workspace-application.test.ts src/main/workspace-service.test.ts src/preload/preload.contract.test.ts src/renderer/app.autosave.test.ts
npm run test -- packages/editor-core/src/decorations/code-highlight.test.ts packages/editor-core/src/extensions/markdown.test.ts src/renderer/editor/ThemeSurfaceHost.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx
npm run test -- packages/editor-core/src/decorations packages/editor-core/src/extensions/markdown.test.ts src/renderer/editor/ThemeSurfaceHost.test.tsx src/renderer/export-html.test.ts src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/app.autosave.test.ts
npm run test -- src/main/analyze-renderer-bundle.test.ts
npm run perf:bundle
npm ls --omit=dev --depth=0
npm test
npm run test:empty-document-layout
npm run test:editing-experience
git diff --check
```

结果：

- build 通过。
- `dist/assets/App-DlTYTB36.js` 229.63 kB，gzip 64.46 kB。
- Vite build 不再报告超过 500 kB 的 chunk。
- 聚焦性能测试通过：4 files / 6 tests。
- `perf:baseline` 通过，并输出 bundle report、renderer derived-data report、editor-core parse/duration report。
- `perf:bundle` 通过，并输出 `bundleBudget=PASS`。
- `typecheck` 通过。
- `lint` 通过。
- `perf:baseline` 的 sourcemap build 后会执行普通 renderer build；当前 `dist/assets` 无 `.map` 残留。
- PERF-005 subagent 验收通过；两轮 spec review 指出 lazy-continuation / plain-text tail root list candidate 漏收，修复后 spec re-review 与 code quality review 均 PASS。
- PERF-006 subagent 验收通过；首轮 spec review 指出 100 次连续输入与 dirty active tab close 覆盖不足，补测试后 spec re-review 与 code quality review 均 PASS。
- PERF-007 subagent 验收通过；spec review 与 code quality review 均 PASS。
- PERF-008 subagent 初验指出 lazy/initial 报告语义和文档记录问题；修复 analyzer 的静态 import 闭包推导与文档记录后复验 PASS。
- PERF-009 最终验收通过；全量 Vitest 首轮因性能探针默认 timeout 过短失败，补显式 timeout 后全量复跑 PASS。

最新 `perf:baseline` 关键数字：

- renderer JS 总量：1,057,357 bytes，gzip 344,025 bytes。
- first editor load initial gzip：227,693 bytes。
- editor chunk：`App-DlTYTB36.js` 229,680 bytes，gzip 63,743 bytes。
- largest initial chunk：`dist-D73l3iB9.js` 255,081 bytes，gzip 82,117 bytes。
- 5000 行 mixed fixture：sourceLength 101,027。
- renderer outline：500 items，约 539.51 ms。
- renderer metrics：meaningfulCharacterCount 61,136，约 562.72 ms。
- editor insertText：约 426.79 ms，parseCalls 1，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=0`。
- editor selectionMove：约 10.17 ms，parseCalls 0，`parserCalls.markdownDocument=0`，`parserCalls.blockMap=0`。
- editor orderedListEdit：约 428.31 ms，parseCalls 2，`parserCalls.markdownDocument=1`，`parserCalls.blockMap=1`。

最终回归结果：

- 相关功能回归：24 files / 384 tests 通过。
- 全量 Vitest：104 files / 1040 tests 通过。
- 空文档布局 probe：PASS。
- 真实编辑体验 probe：PASS。

## 任务状态表

### PERF-001 建立性能基线与预算

状态：PASS

完成条件：

- [x] 有可重复运行的长文档 fixture。
- [x] 有 parse count / input latency / selection latency / bundle size 报告。
- [x] `npm run perf:baseline` 可运行。

### PERF-002 建立统一 EditorDerivedState

状态：PASS

完成条件：

- [x] 同一事务内 Markdown document parse 不重复。
- [x] selection-only update 不重新 parse。
- [x] decorations、active block、table cursor 复用同一派生状态。

风险：

- 需要小心 table widget 与 active block 的更新时机。
- 不能破坏 IME composition guard。

本轮完成：

- 新增 `packages/editor-core/src/derived-state/editor-derived-state.ts`。
- `EditorDerivedState` 统一承载 `source`、`selection`、`markdownDocument`、`activeBlockState`、`tableCursor`、`referenceDefinitions`、`outlineHeadings`。
- `deriveInactiveBlockDecorationsState` 支持直接消费 `editorDerivedState`，避免再次读取 document cache。
- `createBlockDecorations` 支持复用 parser 已收集的 `referenceDefinitions`，避免 decoration 阶段再次扫描 source。
- `markdown.ts` 的 create / recompute 路径改为先创建 `EditorDerivedState`，再将其传给 inactive decorations。
- 新增 parse spy 测试，证明一次普通输入最多一次 Markdown document parse，selection-only update 不重新 parse。
- 修复 code quality review 指出的 legacy `blockMapCache` 兼容路径：缺少 `referenceDefinitions` 元数据时保留 `undefined`，让 decoration 继续 fallback 收集 definitions；新增 list reference-style image widget 回归测试。

验收状态：

- spec subagent：PASS。
- code quality subagent：首次 FAIL，修复 legacy `blockMapCache` reference definitions fallback 后复验 PASS。

### PERF-003 将 outline 与 metrics 移出同步输入路径

状态：PASS

完成条件：

- [x] 输入路径不直接全量 derive outline。
- [x] render 阶段不直接全量计算 metrics。
- [x] wordCount / theme env 可以延迟但不会永久过期。

风险：

- 当前主题动态效果会读取 word count，延迟更新需要 UI 可接受。

本轮完成：

- 新增 `src/renderer/editor/useDocumentDerivedDataController.ts`。
- 文档打开 / 切换路径通过 `applyDocumentDerivedDataNow()` 保持 outline 与 metrics 立即可用。
- 输入路径通过 `scheduleDocumentDerivedDataUpdate()` 只记录最新内容并延迟派生，避免每次 keypress 同步运行 `deriveOutlineItems()` / `getDocumentMetrics()`。
- `App.tsx` render 阶段不再直接调用 `getDocumentMetrics(fullContent)`。
- active document draft snapshot 更新不再触发打开文档 effect 的同步 derived-data 重算；该 effect 只跟 active tab 与 editor load revision 对齐。
- 新增 hook 测试和 App 集成测试，证明输入 tick 内 word count 不同步刷新，延迟任务后刷新到最新内容。

本轮边界：

- `src/renderer/document-metrics.ts` 与 `src/renderer/document-metrics.test.ts` 的相对 HEAD 语义 diff 是 PERF-003 开始前已存在的 worktree 改动；PERF-003 没有修改这两个文件。

验收状态：

- spec subagent：首次 FAIL，将既有 `document-metrics.ts` 语义 diff 归入本轮；标明 out-of-scope 后复验 PASS。
- code quality subagent：PASS。

### PERF-004 收敛 decoration 与代码块高亮重建范围

状态：PASS

完成条件：

- [x] selection-only update 不遍历全文 blocks。
- [x] code fence highlight 支持缓存和超长 fallback。
- [x] 当前 Markdown 渲染几何不回退。

风险：

- decoration range 与 CodeMirror change mapping 需要非常谨慎。
- scoped rebuild 可能影响列表、引用、表格的隐藏源码表现。

本轮完成：

- 新增 `createSelectionScopedBlockDecorations()`，selection-only 且 source 不变时只重建 previous / next active block 的 decoration range。
- `markdown.ts` 的 selection-only path 改为使用 CodeMirror `DecorationSet.update()` 过滤受影响 block span 并添加新 decoration，不再走全文 `createBlockDecorations()`。
- code fence highlight 增加 `language + code content hash` 缓存，语言别名会归一到同一个 parser key。
- 超长 code fence 超过同步高亮上限时跳过 parser work，仅保留 code block 基础样式。
- 新增跨 block、列表跨行 selection-only 测试，断言 active presentation 更新且 full decoration build hook 不触发。

验收状态：

- spec subagent：首次 FAIL，指出跨 block / 跨行 selection-only 仍回退全文 rebuild；修复 scoped decoration path 后复验 PASS。
- code quality subagent：PASS。

### PERF-005 缩小 ordered-list normalization 范围

状态：PASS

完成条件：

- [x] 非列表输入不触发全文 list normalization。
- [x] 列表输入只 normalize 当前 root list。
- [x] 现有 ordered list 语义保持。

风险：

- paste 多 range 文本时需要 fallback 策略。

本轮完成：

- `computeNormalizedOrderedListDocument()` 支持 `changedRanges`。
- 单 range 输入先定位 changed range 所在连续非空 run，只有 run 内存在 list marker 才 parse candidate slice。
- 解析后只 normalize 与 changed range 相交、包含 ordered scope 的目标 list block。
- 多 range 或缺少 changed range 时保留全文 fallback，优先保语义正确。
- extension transaction filter 将 CodeMirror `transaction.changes` 的 new-doc ranges 传入 normalization。
- 新增非列表输入免 parse、空行后追加普通文本免 parse、单 root list 局部 parse、多 range fallback、lazy continuation / plain-text tail root list 语义测试。

验收状态：

- spec subagent：两轮 FAIL，分别指出 lazy-continuation root list 与 plain-text tail 行候选漏收；修复后复验 PASS。
- code quality subagent：PASS。

### PERF-006 重构 renderer 到 main 的 draft sync 策略

状态：PASS

完成条件：

- [x] 输入不再每次发送完整 content IPC。
- [x] Save / Autosave / Save As / close / tab switch / open before replace 都能 flush 最新内容。
- [x] main / preload / renderer 边界仍然符合安全规则。

风险：

- workspace canonical truth、保存、关闭确认和外部冲突保护仍是高敏链路；后续修改必须保留边界 flush 测试。

本轮完成：

- `updateDraft()` 改为只写 renderer-local active draft projection 与 dirty 状态，不再每次输入调用 `fishmark.updateWorkspaceTabDraft()`。
- `flushActiveWorkspaceDraft()` 在 save/autosave/save as/tab switch/close/open/window close 等边界读取最新 editor buffer 并串行 flush。
- 旧 IPC snapshot 返回时通过 `preserveActiveDocumentDraft` 保留同一 active tab 的本地新输入，避免覆盖更新中的 editor content。
- 新增 100 次连续输入测试：flush 前 0 次完整 draft IPC，flush 后 1 次同步最新内容。
- 新增 dirty active tab 从 tab strip close 前 flush 测试，并断言 flush 顺序早于 `closeWorkspaceTab`。

验收状态：

- spec subagent：首次 FAIL，指出 100 次连续输入与 dirty active tab close 测试覆盖不足；补测试后复验 PASS。
- code quality subagent：PASS。

### PERF-007 拆分低频 runtime import 与 editor 主 chunk

状态：PASS

完成条件：

- [x] export-html 不在首屏 editor chunk。
- [x] shader runtime 不在没有 active surface 时加载。
- [x] language parsers 不在无对应 fenced code block 时加载。
- [x] 主 chunk 比当前 791.54 kB 明显下降。

风险：

- CodeMirror parser lazy load 如果设计不好，会让 decoration 构建变异步，必须有 fallback。

本轮完成：

- HTML export 改为 command 内 dynamic import `../export-html`。
- Theme surface runtime 改为 surface mount effect 内 dynamic import；effects off 直接 fallback。
- 新增 code fence language parser lazy loader，按语言请求 parser chunk。
- decoration 构建保持同步；parser 未 ready 时返回空高亮，加载完成后 force refresh decorations。
- `App` chunk 从 PERF-006 的约 797.45 kB 降至约 229.68 kB，Vite 不再报告 App chunk 超过 500 kB。

验收状态：

- spec subagent：PASS。
- code quality subagent：PASS。

### PERF-008 建立 bundle 和 dependency budget

状态：PASS

完成条件：

- [x] `npm run perf:bundle` 输出 PASS / FAIL。
- [x] bundle budget 可阻止后续回退。
- [x] production dependency 边界清楚。

风险：

- Electron 应用的生产依赖与 renderer bundled dependency 容易混淆，报告需要分开。

本轮完成：

- `analyze-renderer-bundle.mjs` 增加 `bundleBudget=PASS/FAIL` 与每条 budget check。
- budget 覆盖最大初始 chunk、最大初始 gzip chunk、first editor load initial gzip、总 JS gzip。
- `requiredLazyChunk` 与 `forbiddenInitialSourceGroup` 基于 `index.html` 入口 + editor chunk 静态 import 闭包判断，避免 export-html/theme/parser 重新进入首个 editor load。
- `perf:bundle` 接入 budget gate，失败时 analyzer 非 0 退出。
- `npm ls --omit=dev --depth=0` 仍只包含 `electron-updater@6.8.3`。

验收状态：

- spec subagent：首次 FAIL，指出 lazy/initial 语义与文档记录缺口；修复后复验 PASS。

### PERF-009 长文档最终验收与收尾

状态：PASS

完成条件：

- [x] 质量门禁通过。
- [x] 性能专项通过。
- [x] `docs/test-report.md` 与任务总结记录最终数据。

风险：

- 如果自动 benchmark 在不同机器波动大，需要用 parse count 和 bundle size 作为硬门槛，用耗时数字作为参考门槛。

本轮完成：

- 跑完整质量门禁：`typecheck`、`lint`、`build`、`git diff --check`。
- 跑性能专项：`perf:baseline` / `perf:bundle`。
- 跑相关回归：24 files / 384 tests。
- 跑全量 Vitest：104 files / 1040 tests。
- 跑真实体验 probes：空文档布局与 Markdown 编辑体验均 PASS。
- 将最终数据写入 `docs/test-report.md`、`docs/decision-log.md` 与任务总结。

验收状态：

- final subagent review：PASS。

### PERF-010 列表 marker 输入回归收口

状态：PASS

完成条件：

- [x] `-` / `1.` / `1)` 裸 marker 不提前 parse。
- [x] `- ` / `1. ` / `1) ` 输入空格后才提交列表 marker。
- [x] active marker 后继续输入文本，DOM selection 不落在隐藏 source-prefix 或 0 宽隐藏节点。
- [x] `- ` 后 IME composition preview 与 caret 保持在 marker 后同一行。
- [x] active/inactive list content 与 marker 几何保持零偏移。
- [x] 空 marker / 嵌套 marker Backspace 逻辑保持通过。

风险：

- macOS 系统候选窗本身无法由 jsdom 单测证明，需要真实 Electron/Chromium probe 至少测 DOM selection range、caret rect 与文本 rect。

本轮完成：

- 新增 `- ` 提交 active list marker 后的 composition probe。
- `block-decorations` 中 active list marker 改为 generated marker widget。
- marker 后空格不再包进 `.cm-active-list-source-prefix`，改为有实际宽度、overflow visible、非透明 caret-color 与非透明 text color 的 caret anchor，并用负 margin 抵消布局宽度；probe 会注入模拟 IME preedit 文本，防止拼音组合态再次被透明样式隐藏。
- 嵌套列表 Enter 自动创建空 marker 后，Backspace 删除 marker 留下的缩进空行不再套用 `cm-inactive-blank-line` 的 0 高度折叠；真实 Electron/Chromium probe 断言该行有可见高度，caret 坐标落在该行内。
- `npm run test:list-geometry` 确认 active/inactive contentLeft/contentTop/markerRight/marker baseline delta 均为 0。
- 更新 `block-decorations.test.ts`、`code-editor.test.ts` 与 `markdown-editing-experience-probe.ts`。
- `docs/test-report.md` 记录本轮回归命令和结果。

验收状态：

- 本地质量门禁 PASS，subagent 独立验收 PASS。

### PERF-011 列表内容框选回归收口

状态：PASS

完成条件：

- [x] 列表内容拖拽选择不再折叠到内容起点。
- [x] 无序、有序、task、嵌套列表都被真实 Electron/Chromium probe 覆盖。
- [x] 原有列表点击后继续输入不回归。
- [x] `elementFromPoint` fallback 在浏览器 probe 可用，在 jsdom 缺失时不抛错。
- [x] 相关 Vitest、真实 probes、typecheck、lint、build 与 diff check 通过。
- [x] subagent 独立验收通过。

风险：

- 自定义 block pointer drag selection 现在覆盖 marker 相关点击和列表内容拖拽；后续如果引入更多 transformed block，需要复用同一套 drag tracking，而不是再在 mousedown 里直接吞掉原生选择。

本轮完成：

- 在 `markdown-editing-experience-probe.ts` 增加无序、有序、task、嵌套列表 visible content 拖拽框选 case。
- `markdown.ts` 中 block pointer mousedown 后注册 mousemove / mouseup，拖拽超过阈值时按当前坐标更新 selection head。
- `context.ts` 中 pointer context 支持通过 `elementFromPoint` 从当前坐标找回 `.cm-line`，并在 jsdom 缺少该 API 时安全返回 null。
- `registry.test.ts` 增加 jsdom 单测，mock `elementFromPoint` 覆盖 document-target drag fallback。
- 验证 `npm run test:editing-experience`、`npm run test:list-geometry`、相关 Vitest、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 均通过。

验收状态：

- 本地质量门禁 PASS，subagent 独立验收 PASS。

## 下一步建议

本任务已完成，下一步可进入人工试用或按需提交代码评审。

## 状态更新规则

后续每推进一个 PERF task，需要更新：

- 本文件的任务状态与完成度。
- `route-map.md` 中对应任务的验收结果，如验收标准发生变化必须同步修改。
- `docs/test-report.md`，记录实际命令和结果。
- 如果改动架构边界，更新 `docs/decision-log.md`。

状态值：

- TODO：未开始。
- IN_PROGRESS：正在实现。
- DEV_DONE：实现完成，等待 review。
- CHANGES_REQUESTED：review 要求修改。
- ACCEPTED：已通过 review。
- CLOSED：已合并或用户确认收尾。
