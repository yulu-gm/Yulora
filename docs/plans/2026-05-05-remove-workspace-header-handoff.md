# Task Handoff: remove-workspace-header

Task: 临时 UI cleanup `remove-workspace-header`
Status: implementation complete, ready for acceptance

## 改了什么

- 移除了 workspace 内独立 header 的 JSX 和对应 props；macOS controlled titlebar 仍继续使用 `headerTitle`。
- 将 workspace 布局调整为 conflict/banner row、tab row、canvas row，阅读模式下 canvas 回到第一行。
- 删除了 `.app-header`、workspace title/detail/hint 等废弃样式。
- 把打开文档身份断言迁移到 active workspace tab：tab 文本显示文件名，`title` 保留完整路径。
- 移除了 fixture theme 中已失效的 `[data-fishmark-surface="workspace-header"]` 规则，并同步更新主题作者文档。

## 落点文件

- `src/renderer/editor/WorkspaceShell.tsx`
- `src/renderer/editor/App.tsx`
- `src/renderer/styles/app-ui.css`
- `src/renderer/editor/WorkspaceShell.test.tsx`
- `src/renderer/app.autosave.test.ts`
- `fixtures/themes/rain-glass/styles/ui.css`
- `fixtures/themes/ember-ascend/styles/ui.css`
- `fixtures/themes/pearl-drift/styles/ui.css`
- `fixtures/themes/sakura-cat/styles/ui.css`
- `docs/theme-authoring-guide.md`

## 已跑验证

- `npm.cmd run test -- src/renderer/editor/WorkspaceShell.test.tsx` PASS
- `npm.cmd run test -- src/renderer/app.autosave.test.ts` PASS
- `npm.cmd run lint` PASS，保留既有 `react-refresh/only-export-components` warning
- `npm.cmd run typecheck` PASS
- `npm.cmd run build` PASS

## 人工验收草稿

1. 启动 FishMark 并打开一个 Markdown 文件。
2. 确认 workspace 顶部只有 tab strip，不再出现独立文件 header。
3. 确认 active tab 显示文件名，鼠标悬停可看到完整路径 tooltip。
4. 切换阅读/编辑模式，确认 rail、tab strip、status bar 的折叠行为正常，编辑画布不被顶部空白挤压。
5. 打开偏好设置或切换主题，确认主题视觉仍正常，未出现针对 header 的残留面板。

## 已知风险或未做项

- 本轮没有处理工作树中其他多文件拖拽打开相关改动。
- 未做 Electron offscreen 截图验收；本轮以组件/CSS 合同测试、lint、typecheck、build 覆盖。
