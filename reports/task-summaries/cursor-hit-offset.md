# Cursor Hit Offset

日期：2026-05-05

## 结果

PASS

## 完成内容

- 新增 `npm run test:cursor-hit-geometry`，用真实 Electron/Chromium 测量点击可见文本中心后的 CodeMirror `posAtCoords` 命中行。
- 复现并修复分割线后、表格后普通文本点击需要向上偏移的问题。
- 将会影响 hit-testing 的块级垂直间距从外部 margin 收敛到 CodeMirror 可测量的 padding / widget box 内。
- 补充 CSS 契约测试、测试用例文档和决策记录。

## 验证

- `npm.cmd run test:cursor-hit-geometry`：通过
- `npm.cmd run test:list-geometry`：通过
- `npm.cmd run test -- src/renderer/editor-source-layout.test.ts src/renderer/code-editor.test.ts packages/editor-core/src/decorations/block-decorations.test.ts`：通过，3 个文件、193 项
- `npm.cmd run test -- src/renderer/app.autosave.test.ts`：通过，1 个文件、151 项
- `npm.cmd run lint`：通过，保留既有 Fast Refresh warning
- `npm.cmd run typecheck`：通过
- `npm.cmd run test`：通过，94 个文件、947 项
- `npm.cmd run build`：通过，保留既有 Vite chunk-size warning
- `git diff --check`：通过，仅有 LF/CRLF 归一化提示

## 人工验收

1. 打开包含 blockquote、fenced code block、分割线、表格和普通段落的 Markdown 文档。
2. 把光标移到最后一个普通段落，让前面的块进入 inactive 渲染态。
3. 点击分割线后第一段普通文本的可见文字中心。
4. 点击表格后第一段普通文本的可见文字中心。
5. 确认光标落在被点击的同一行，不需要故意点击文字上方。

## 剩余风险

- 本轮 probe 未覆盖大型图片预览加载完成后的后续文本点击命中；如果后续发现图片后文本也有偏移，应按同一原则检查 preview widget 是否使用了外部 vertical margin。
- 工作区中存在本轮开始前已有的脏文件和临时工件，本轮未回滚也未清理。
