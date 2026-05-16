# Editor Performance Optimization

日期：2026-05-12
状态：PASS

## 本轮完成内容

- 建立 `perf:baseline` / `perf:bundle`，把长文档 parse count、derived-data 耗时和 renderer bundle 变成可重复报告。
- 新增统一 `EditorDerivedState`，让 active block、table cursor、reference definitions、outline heading projection 复用单次 Markdown document parse。
- 将 outline / metrics 从输入同步路径移出，改为文档打开立即计算、输入路径延迟调度。
- selection-only 更新改为 scoped decoration refresh；code fence highlight 增加缓存和超长 fallback。
- ordered-list normalization 从全文 fallback 收缩到单 range changed root list；多 range paste 保留语义优先 fallback。
- workspace draft sync 输入路径不再每次 IPC 发送完整 content；改为 renderer-local dirty projection，并在 save/autosave/tab switch/close/open/window close 前 flush 最新内容。
- export-html、theme surface runtime 与 code fence language parsers 从 editor 主 chunk 拆为 dynamic import。
- bundle analyzer 增加 first editor load 静态 import 闭包和预算门禁，`perf:bundle` 可输出 `bundleBudget=PASS/FAIL` 并在失败时非 0 退出。

## 主要改动文件

- `package.json`
- `scripts/analyze-renderer-bundle.mjs`
- `src/main/analyze-renderer-bundle.test.ts`
- `packages/editor-core/src/derived-state/editor-derived-state.ts`
- `packages/editor-core/src/derived-state/editor-derived-state.test.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/decorations/code-highlight.ts`
- `packages/editor-core/src/decorations/code-highlight-cache.ts`
- `packages/editor-core/src/decorations/code-highlight-language-loader.ts`
- `packages/editor-core/src/extensions/markdown.ts`
- `packages/editor-core/src/commands/list-edits.ts`
- `src/renderer/editor/useDocumentDerivedDataController.ts`
- `src/renderer/editor/useWorkspaceController.ts`
- `src/renderer/editor/useEditorApplicationController.ts`
- `src/renderer/editor/ThemeSurfaceHost.tsx`
- `docs/plans/2026-05-12-editor-performance-optimization/`
- `docs/test-report.md`
- `docs/decision-log.md`

## 最终验证

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run perf:baseline`
- `npm run test -- packages/editor-core/src/decorations packages/editor-core/src/commands packages/editor-core/src/extensions/markdown.test.ts src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useSaveController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/app.autosave.test.ts src/renderer/export-html.test.ts src/renderer/editor/ThemeSurfaceHost.test.tsx src/main/workspace-application.test.ts src/main/workspace-service.test.ts src/preload/preload.contract.test.ts src/main/analyze-renderer-bundle.test.ts`
- `npm test`
- `npm run test:empty-document-layout`
- `npm run test:editing-experience`
- `git diff --check`

## 关键结果

- App chunk：从 PERF-006 的约 797.45 kB / gzip 254.25 kB 降到 229.68 kB / gzip 63.74 kB。
- First editor load initial gzip：227,693 bytes。
- Total renderer JS gzip：344,025 bytes。
- `perf:bundle`：`bundleBudget=PASS`。
- 5000 行 mixed fixture：
  - insertText：parseCalls 1，`markdownDocument=1`，`blockMap=0`。
  - selectionMove：parseCalls 0。
  - orderedListEdit：parseCalls 2，`markdownDocument=1`，`blockMap=1`。
- 全量 Vitest：104 files / 1040 tests 通过。
- 空文档布局 probe 和真实编辑体验 probe 均 PASS。

## 剩余风险

- outline / metrics 算法仍是全量派生，只是移出 keypress 同步路径；后续如要进一步优化，需要做增量统计或 worker 化。
- 多 range paste 的 ordered-list normalization 保留全文 fallback。
- 语言 parser 首次加载完成前，code fence 会短暂无语法高亮，加载后自动刷新 decorations。
