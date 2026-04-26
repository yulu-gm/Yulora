# Cursor Scroll Execution Handoff

Date: 2026-04-26

## 改了什么

- 查明根因：FishMark 的自定义 `ArrowUp` / `ArrowDown` 语义导航会拦截部分 CodeMirror 默认上下键逻辑，但只 dispatch selection，没有携带 `scrollIntoView`。默认 CodeMirror 上下键会把 selection transaction 标记为滚入视口，所以两条路径行为不一致，表现为光标先移动、页面之后才追上。
- 在 Markdown command selection update 契约中加入 `scrollIntoView`。
- 让自定义 `ArrowUp`、`ArrowDown` 和连续空行 `ArrowUp` 路径都显式请求滚动。
- 在 CodeMirror command adapter 中把 `scrollIntoView` 传入实际 `view.dispatch()`。
- 补语义命令层与 CodeMirror adapter 层回归测试，覆盖滚动请求从命令意图到 transaction 的传递。

## 落点文件

- `packages/editor-core/src/commands/markdown-commands.ts`
- `packages/editor-core/src/commands/codemirror-markdown-command-adapter.ts`
- `packages/editor-core/src/commands/markdown-commands.test.ts`
- `packages/editor-core/src/commands/codemirror-markdown-command-adapter.test.ts`
- `src/main/main.test.ts`
- `docs/plans/2026-04-26-cursor-scroll-intake.md`
- `docs/plans/2026-04-26-cursor-scroll-handoff.md`

## 推荐验证命令

- `.\node_modules\.bin\vitest.cmd run packages/editor-core/src/commands/markdown-commands.test.ts`
- `.\node_modules\.bin\vitest.cmd run packages/editor-core/src/commands/codemirror-markdown-command-adapter.test.ts`
- `.\node_modules\.bin\vitest.cmd run packages/editor-core/src/commands src/renderer/code-editor.test.ts packages/editor-core/src/extensions/markdown.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`

## 本轮开发自检

- `.\node_modules\.bin\vitest.cmd run packages/editor-core/src/commands/markdown-commands.test.ts`：3 tests passed。
- `.\node_modules\.bin\vitest.cmd run packages/editor-core/src/commands/codemirror-markdown-command-adapter.test.ts`：1 test passed。
- `.\node_modules\.bin\vitest.cmd run packages/editor-core/src/commands src/renderer/code-editor.test.ts packages/editor-core/src/extensions/markdown.test.ts`：13 files, 212 tests passed。
- `.\node_modules\.bin\vitest.cmd run src/main/main.test.ts`：8 tests passed。
- `npm.cmd run typecheck`：passed。
- `npm.cmd run lint`：exit 0；保留既有 `src/renderer/editor/App.tsx` Fast Refresh warning。
- `npm.cmd run test`：87 files, 817 tests passed。
- `npm.cmd run build`：passed；保留既有 Vite chunk-size warning。

## 人工验收草稿

1. 运行 `npm run dev` 打开长 Markdown 文档。
2. 把光标放在接近视口底部的位置，连续按 `ArrowDown`，确认光标每次接近底部时页面立即跟随滚动。
3. 把光标放在接近视口顶部的位置，连续按 `ArrowUp`，确认页面立即跟随滚动。
4. 在包含标题、列表、隐藏 inline marker、表格上下空行的文档中重复上下键移动，确认不会出现移动多行后才追滚动的延迟。

## 已知风险与未做项

- 本轮没有改布局或滚动容器，也没有加入 DOM 手动滚动逻辑。
- 自动化测试覆盖 transaction 语义，不覆盖真实 Electron 窗口像素级滚动表现；建议验收阶段按人工步骤补桌面实测。
- 全量测试暴露 `src/main/main.test.ts` 在 Windows CRLF 下的源码字符串断言脆弱性；本轮已将该测试的源码读取规范化为 LF，未改 main 进程行为。
