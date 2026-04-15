# TASK-013 引用块渲染

日期：2026-04-16
状态：DEV_DONE

## 本轮完成内容

- 在 `src/renderer/code-editor.ts` 的现有 CodeMirror decoration 派生链中补上 top-level `blockquote` 的非激活态渲染
- 非激活引用块现在显示为带缩进和淡色背景的连续区域，同时隐藏 `>` 前缀
- 光标重新进入引用块时，会移除 blockquote decorations，完整恢复 Markdown 源码态
- 在非空引用行按 `Enter` 会自动续出新的 `> ` 行，在空引用行按 `Enter` 会退出当前引用块
- 修复了真实 CRLF 文档在 `replaceDocument()` 后 block decorations 整体错位的问题；`MVP_BACKLOG.md` 这类 Windows 文档现在会基于 CodeMirror 规范化后的文本重新计算 blockMap
- 复用 `TASK-035` 的 composition guard，确保引用块 decoration 不会在组合输入期间提前抖动
- 为引用块补上 editor 回归测试，覆盖非激活态显示、激活恢复、`Enter` 续写/退出、composition flush 和 CRLF 文档回归

## 主要改动文件

- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/styles.css`
- `docs/decision-log.md`
- `docs/test-report.md`
- `docs/progress.md`
- `docs/test-cases.md`
- `MVP_BACKLOG.md`

## 已验证内容

- `npm run test -- src/renderer/code-editor.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## 残余风险

- 当前只覆盖 top-level `blockquote`；引用块内部嵌套列表、代码块或更复杂 Markdown 结构的排版仍待后续任务细化
- 本轮没有补独立人工验收记录，因此 `docs/progress.md` 先记为 `DEV_DONE`，未提升到 `CLOSED`
