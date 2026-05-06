# reference-style image 支持 handoff

日期：2026-05-06

## 改了什么

- `markdown-engine` 新增文档级 reference definition 收集，并把 `![alt][id]` / `[label][id]` 解析为带 `href/title` 的 inline AST。
- `parseBlockMap()` 把 `[id]: ...` 识别为 `definition` block，避免后续阅读态把 definition 当普通正文。
- `editor-core` 在非激活态折叠 definition block，并继续通过现有 Markdown image widget 渲染 reference-style image。
- HTML export 跳过 definition block，并用解析后的 `href/title` 输出图片。

## 落点文件

- `packages/markdown-engine/src/inline-ast.ts`
- `packages/markdown-engine/src/parse-inline-ast.ts`
- `packages/markdown-engine/src/parse-markdown-document.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/block-map.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/decorations/signature.ts`
- `src/renderer/export-html.ts`

## 推荐验证命令

```bash
npm run test -- packages/markdown-engine/src/parse-block-map.test.ts packages/editor-core/src/decorations/block-decorations.test.ts src/renderer/export-html.test.ts
npm run typecheck
npm run lint
npm run build
```

## 人工验收草稿

1. 打开或新建 Markdown 文档，输入：

   ```markdown
   ![Alt text][id]

   [id]: https://octodex.github.com/images/dojocat.jpg  "The Dojocat"
   ```

2. 光标离开图片所在段落后，确认图片预览出现。
3. 光标进入 definition 行，确认原始 `[id]: ...` 仍可编辑。
4. 执行 HTML export，确认导出 HTML 中有图片，且正文不显示 definition 行。

## 已知风险

- 本轮只覆盖常见 reference label，不把复杂嵌套 bracket label 扩成完整 CommonMark label parser。
