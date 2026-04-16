# TASK-034 行内格式渲染

日期：2026-04-16
状态：DEV_DONE

## 本轮完成内容

- 在 `packages/markdown-engine/src/` 建立完整 inline AST，并新增 canonical `parseMarkdownDocument()` 入口
- 保留现有 top-level `blockMap` 作为块级语义边界，`parseBlockMap()` 继续作为兼容包装
- 引入仓库内本地 `strikethrough` extension，支持 `~~strike~~`，不新增外部依赖
- 在 `packages/editor-core/src/` 把 derived state、signature 与 inactive decorations 迁到 MarkdownDocument
- 新增 AST-to-decoration flattening，使非激活态 block 支持 `**bold**`、`*italic*`、`` `code` ``、`~~strike~~` 与常见嵌套 `***both***`、`~~**mix**~~`
- heading、list、blockquote 内的行内格式也会在非激活态成立；光标回到对应 block 后恢复完整 Markdown 源码态
- renderer 改为使用 `parseMarkdownDocument`，并补上 inline marker / content 的最小样式与 DOM 回归测试

## 主要改动文件

- `packages/markdown-engine/src/block-map.ts`
- `packages/markdown-engine/src/index.ts`
- `packages/markdown-engine/src/inline-ast.ts`
- `packages/markdown-engine/src/markdown-document.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/parse-inline-ast.ts`
- `packages/markdown-engine/src/parse-markdown-document.ts`
- `packages/markdown-engine/src/extensions/strikethrough.ts`
- `packages/editor-core/src/active-block.ts`
- `packages/editor-core/src/derived-state/block-map-cache.ts`
- `packages/editor-core/src/derived-state/markdown-document-cache.ts`
- `packages/editor-core/src/derived-state/inactive-block-decorations.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/decorations/inline-decorations.ts`
- `packages/editor-core/src/decorations/signature.ts`
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/styles.css`
- `docs/plans/2026-04-16-task-034-intake.md`
- `docs/plans/2026-04-16-task-034-inline-ast-design.md`
- `docs/plans/2026-04-16-task-034-inline-ast-plan.md`
- `docs/plans/2026-04-16-task-034-handoff.md`
- `docs/decision-log.md`
- `docs/test-cases.md`
- `docs/test-report.md`
- `docs/progress.md`

## 已验证内容

- `npm run lint`
- `npm run typecheck`
- `npm run test -- packages/markdown-engine/src/parse-inline-ast.test.ts packages/markdown-engine/src/parse-block-map.test.ts`
- `npm run test -- packages/editor-core/src/active-block.test.ts packages/editor-core/src/decorations/block-decorations.test.ts packages/editor-core/src/derived-state/inactive-block-decorations.test.ts packages/editor-core/src/extensions/markdown.test.ts src/renderer/code-editor.test.ts`
- `npm run test`
- `npm run build`

## 残余风险

- link/image 目前只保证 label/alt children 的 inline decorations 不被破坏，没有做专门视觉替换
- reference-style links/images 与更复杂边界仍未完整纳入本轮测试
- 本地 `strikethrough` extension 后续升级 micromark 时需要重点回归
- 本轮尚未补单独的桌面人工验收记录，因此 `docs/progress.md` 先记为 `DEV_DONE`
