# Task Intake: remove-workspace-header

Task: 临时 UI cleanup `remove-workspace-header`
Goal: 移除编辑器 workspace 内独立 header，让打开文档的文件名和路径只通过 tab strip 呈现。

In scope:
- 删除 workspace header 的渲染和不再需要的 props
- 调整 workspace grid，让 tab strip 后直接进入 canvas
- 清理 header 相关 CSS、fixture theme surface hook 和主题作者文档
- 更新 renderer 组件测试与 CSS 合同测试

Out of scope:
- 不重做 tab strip 交互或持久化逻辑
- 不调整 main/preload/workspace 数据模型
- 不处理本轮之外的多文件拖拽打开改动

Landing area:
- `src/renderer/editor/WorkspaceShell.tsx`
- `src/renderer/editor/App.tsx`
- `src/renderer/styles/app-ui.css`
- `src/renderer/editor/WorkspaceShell.test.tsx`
- `src/renderer/app.autosave.test.ts`
- `fixtures/themes/*/styles/ui.css`
- `docs/theme-authoring-guide.md`

Acceptance:
- 打开文档时不再渲染 `[data-fishmark-region="workspace-header"]`
- active workspace tab 显示文件名，并通过 `title` 保留完整路径
- workspace canvas 在 header 移除后仍占据主编辑区域
- 主题包不再声明无效的 workspace header surface hook

Verification:
- `npm.cmd run test -- src/renderer/editor/WorkspaceShell.test.tsx`
- `npm.cmd run test -- src/renderer/app.autosave.test.ts`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Risks:
- 工作树存在其他未提交改动，本任务只对 header removal 相关落点负责。
