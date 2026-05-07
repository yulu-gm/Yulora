# Review Findings Cleanup Handoff

日期：2026-05-06
任务：review-findings-cleanup

## 改了什么

- 删除生产 `ProductBridge` 中的旧 `openMarkdownFile` / `openMarkdownFileFromPath` API，并移除 preload 暴露、旧 IPC channel 常量、main 旧 handler 与对应 preload contract 覆盖。
- 保留 workspace open API 作为生产打开入口；startup open path、外部打开、drag/drop 继续走 `openWorkspaceFileFromPath` / workspace path event。
- 从 `App.tsx` 抽出 `editor-pointer-utils.ts` 与 `useWindowMarkdownFileDrop.ts`，把 editor pointer/focus 判断和窗口级 Markdown 文件拖放从 App orchestration root 中分离。
- 将 `code-highlight.ts` 的同步 parser registry 收缩到常用语言，低频语言不再 eager import；同步移除不再引用的低频 language package；新增测试确认 JS 仍高亮、SQL 不再同步加载 parser。
- 更新 `packages/editor-core/README.md`，明确当前包同时包含 Markdown 语义逻辑与 CodeMirror runtime / adapter。
- 将 2026-05-05 的 HTML export 合并回 `TASK-019` 状态真相，同步 `MVP_BACKLOG.md`、`docs/progress.md`、`reports/task-summaries/TASK-019.md` 和原 handoff。

## 落点文件

- `src/shared/product-bridge.ts`
- `src/shared/open-markdown-file.ts`
- `src/preload/preload.ts`
- `src/preload/preload.contract.test.ts`
- `src/main/main.ts`
- `src/renderer/editor/App.tsx`
- `src/renderer/editor/editor-pointer-utils.ts`
- `src/renderer/editor/useWindowMarkdownFileDrop.ts`
- `src/renderer/editor/App.focus.test.tsx`
- `src/renderer/app.autosave.test.ts`
- `src/renderer/test-workbench.test.tsx`
- `package.json`
- `package-lock.json`
- `packages/editor-core/src/decorations/code-highlight.ts`
- `packages/editor-core/src/decorations/code-highlight.test.ts`
- `packages/editor-core/README.md`
- `MVP_BACKLOG.md`
- `docs/progress.md`
- `docs/plans/2026-05-05-html-export-handoff.md`
- `reports/task-summaries/TASK-019.md`

## 推荐验证命令

- `npm.cmd run test -- src/preload/preload.test.ts src/preload/preload.contract.test.ts src/main/main.test.ts src/renderer/app.autosave.test.ts src/renderer/editor/useEditorApplicationController.test.tsx packages/editor-core/src/decorations/block-decorations.test.ts packages/editor-core/src/decorations/code-highlight.test.ts`
- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `git diff --check`

## 本轮验证结果

- Focused tests：7 个文件、219 项测试通过。
- Full tests：96 个文件、980 项测试通过。
- `npm.cmd run lint` 通过，未再出现 Fast Refresh warning。
- `npm.cmd run typecheck` 通过。
- `npm.cmd run build` 通过；`App` chunk 为 756.36 kB，仍超过 Vite 默认 500 kB warning 阈值。
- `git diff --check` 通过，仅输出 Windows LF/CRLF 归一化提示。

## 人工验收草稿

1. 启动应用后通过 `File > Open...` 打开一个 `.md`，确认进入当前 workspace tab。
2. 使用启动参数或系统外部打开 `.md`，确认目标文件进入已有 workspace 窗口或 startup open path。
3. 拖放一个或多个 `.md` 到窗口，确认按原行为在当前 workspace 中打开。
4. 打开含 `js` 与 `sql` code fence 的文档，确认 JS 仍有基础 syntax class，SQL 作为普通 code block 可读但不做 token highlight。
5. 使用 `Export HTML...` 导出当前文档，确认文档可打开、主题样式被内联、dirty 状态不被清除。

## 已知风险

- build 仍保留 Vite chunk-size warning；本轮已把 App chunk 从约 1.25 MB 降到 756.36 kB，但没有引入异步 parser / route 级拆包。
- 低频 code fence 语言不再同步高亮，后续若要恢复应以明确的按需 parser 加载设计推进。
- HTML export 仍不做 local image bytes embedding，也不提供完整 code fence syntax tokenization。
