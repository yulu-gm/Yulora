# TASK-018 查找替换

日期：2026-05-11
状态：DEV_DONE

## 本轮完成内容

- 在左侧 rail 增加查找替换入口，并支持 `Ctrl/Command+F` 打开浮层面板。
- 面板维护当前查找词、替换文本和匹配计数，提供上一项 / 下一项、替换当前和替换全部操作。
- `CodeEditorController` 复用 `@codemirror/search` 的 search state、find / replace 命令与匹配高亮，替换事务进入现有 CodeMirror history。
- `CodeEditorView` 透传查找替换句柄，`WorkspaceShell` 不直接改写文档，只委托给编辑器控制器。
- 补充查找替换控制器测试与 WorkspaceShell UI 委托测试。
- 同步 backlog、progress、design、decision log、test cases、test report、intake 与 handoff。

## 主要改动文件

- `package.json`
- `package-lock.json`
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/code-editor-view.tsx`
- `src/renderer/editor/WorkspaceShell.tsx`
- `src/renderer/editor/WorkspaceShell.test.tsx`
- `src/renderer/styles/app-ui.css`
- `src/renderer/styles/editor-source.css`
- `MVP_BACKLOG.md`
- `docs/progress.md`
- `docs/design.md`
- `docs/decision-log.md`
- `docs/test-cases.md`
- `docs/test-report.md`
- `docs/plans/2026-05-11-task-018-intake.md`
- `docs/plans/2026-05-11-task-018-handoff.md`

## 已验证内容

- `npm run test -- src/renderer/code-editor.test.ts`
- `npm run test -- src/renderer/editor/WorkspaceShell.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `git diff --check`

## 剩余风险

- 本轮未交付正则、大小写开关、whole-word、跨文件搜索或搜索历史。
- 本轮尚未做真实桌面人工验收，因此 `docs/progress.md` 先记为 `DEV_DONE`，未提升到 `CLOSED`。
