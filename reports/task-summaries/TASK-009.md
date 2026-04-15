# TASK-009 总结

日期：2026-04-15

完成内容：
- 在 `packages/editor-core/src/active-block.ts` 中新增 active block 纯状态模型，基于 `packages/markdown-engine` 的 block map 按选择位置解析当前顶层 block
- 新增 `packages/editor-core/src/active-block.test.ts`，覆盖标题、段落、列表、引用块，以及块尾换行和块间空白的边界行为
- 在 `src/renderer/code-editor.ts` 中把 CodeMirror 的选择变化与文档变化映射为 active block 更新，并通过最小 callback 暴露给 renderer
- 在 `src/renderer/code-editor.test.ts` 中补了真实 CodeMirror 选择变化和 `replaceDocument()` 重算 active block 的回归测试
- 在 `src/renderer/App.tsx` 中接入 renderer-side active block ref，但没有引入任何可见 UI，保持 `TASK-009` 只交付基础设施
- 更新 `packages/editor-core/README.md`、`docs/test-cases.md`、`docs/decision-log.md`、`docs/test-report.md`、`docs/progress.md` 与 `MVP_BACKLOG.md`

验证结果：
- `npm run test -- packages/editor-core/src/active-block.test.ts src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts` 通过
- `npm run lint` 通过
- `npm run typecheck` 通过
- `npm run test` 通过
- `npm run build` 通过

说明：
- 本轮没有加入任何 active block 可见调试 UI，也没有提前进入标题/段落/列表/引用的渲染态切换
- 当前 active block 仍只基于 top-level block map；后续若 `TASK-012` 需要 list item 级别语义，需要在 `packages/markdown-engine` 上继续扩展
- build 阶段仍存在 Vite 默认的大 bundle warning，但它不影响当前功能正确性，也不是 `TASK-009` 的范围
