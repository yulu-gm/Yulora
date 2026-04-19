Task: 阅读模式 / 编辑模式重定义（新提案）
Goal: 用明确的阅读模式和编辑模式替换旧聚焦模式；已有文档默认阅读，新建文档默认编辑，并让阅读模式下的 workspace 真正居中、左右留白对称。
In scope:
- 删除旧 focus mode 的交互概念、运行时控制器和设置项
- 在 renderer shell 引入 `reading | editing` 双模式状态
- 实现已有文档默认阅读、新建文档默认编辑
- 实现点击正文进入编辑、`Esc` 或点击正文空白区退出编辑
- 阅读模式收起 rail / header / status bar / outline，并让 workspace 居中
- 统一相关测试、文档和 runtime 命名
Out of scope:
- 修改 Markdown 内容模型
- 修改 autosave 规则
- 为模式切换新增额外 UI 提示条或新设置项
- 修改菜单、命令面板或其他未明确要求的快捷键体系
Landing area:
- `src/renderer/editor/App.tsx`
- `src/renderer/app.autosave.test.ts`
- `src/renderer/styles/app-ui.css`
- `src/renderer/editor/settings-view.tsx`
- `src/shared/preferences.ts`
- `src/shared/preferences.test.ts`
- `src/shared/theme-style-contract.ts`
- `src/renderer/shader/*`
- `docs/design.md`
- 相关 `docs/superpowers/specs/*`
Acceptance:
- 打开已有文档默认进入阅读模式
- 新建文档默认进入编辑模式
- 点击正文时立即进入编辑模式
- `Esc` 或点击正文空白区时退出到阅读模式
- 阅读模式下 rail / header / status bar / outline 收起
- 阅读模式下 workspace 居中，左右留白一致
- 编辑器主体在模式切换中不卸载
- 用户可见文案中不再出现 focus mode
Verification:
- `npm run lint`
- `npm run typecheck`
- `npm run test -- src/renderer/app.autosave.test.ts src/shared/preferences.test.ts src/renderer/shader/theme-scene-state.test.ts src/renderer/shader/theme-surface-runtime.test.ts`
- `npm run test`
- `npm run build`
- 手工抽查阅读模式下窗口放宽时主工作区是否保持居中且左右留白一致
Risks:
- 触及 shell 交互状态流，容易影响光标进入 / 退出编辑区的稳定性
- 触及 outline 可见性恢复逻辑，容易出现状态丢失
- 触及 theme runtime 命名，容易连带 CSS env / shader test 回归
- 触及用户可见行为，需要同步文档，避免 focus / reading / editing 术语混用
Doc updates:
- `docs/superpowers/specs/2026-04-19-reading-editing-mode-design.md`
- `docs/design.md`
- 完成时补 `docs/test-report.md`
- 完成时补 `reports/task-summaries/`
- 如 backlog 范围需要补充，再更新 `MVP_BACKLOG.md`
Next skill:
- `$yulora-task-execution`（当前会话未提供该 skill；待 spec review 通过后直接进入实现）
