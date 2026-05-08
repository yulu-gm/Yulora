# TASK-014 链接显示与编辑

日期：2026-05-08
状态：DEV_DONE

## 本轮完成内容

- 基于 `markdown-engine` 已有 inline link AST，在非激活态把链接显示为可读 label，并隐藏 `[]()` 与 destination 语法。
- 保留链接 label 内部的 strong / emphasis / code 等行内装饰叠加，避免链接渲染破坏已有 inline formatting。
- 保留普通点击回到源码编辑路径；新增 `Mod-click` 打开非激活态链接，新增 `Mod-Enter` 打开光标所在链接。
- 新增 `window.fishmark.openExternalLink()` 受限 bridge，renderer 只提交 href。
- main 进程新增 `fishmark:open-external-link` IPC，仅允许 `http:`、`https:`、`mailto:` 后调用 `shell.openExternal()`。
- 更新 TASK-014 backlog、进度、test case、决策记录和 handoff。

## 主要改动文件

- `packages/editor-core/src/decorations/inline-decorations.ts`
- `packages/editor-core/src/extensions/markdown.ts`
- `packages/editor-core/src/decorations/block-decorations.test.ts`
- `packages/editor-core/src/extensions/markdown.test.ts`
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/code-editor-view.tsx`
- `src/renderer/editor/App.tsx`
- `src/renderer/editor/WorkspaceShell.tsx`
- `src/renderer/editor/WorkspaceShell.test.tsx`
- `src/renderer/app.autosave.test.ts`
- `src/renderer/test-workbench.test.tsx`
- `src/shared/external-link.ts`
- `src/shared/product-bridge.ts`
- `src/preload/preload.ts`
- `src/preload/preload.test.ts`
- `src/preload/preload.contract.test.ts`
- `src/main/main.ts`
- `src/main/main.test.ts`
- `src/renderer/styles/markdown-render.css`
- `MVP_BACKLOG.md`
- `docs/progress.md`
- `docs/decision-log.md`
- `docs/test-cases.md`
- `docs/test-report.md`
- `docs/plans/2026-05-08-task-014-intake.md`
- `docs/plans/2026-05-08-task-014-handoff.md`

## 已验证内容

- `npm.cmd run test -- packages/editor-core/src/decorations/block-decorations.test.ts packages/editor-core/src/extensions/markdown.test.ts src/renderer/code-editor.test.ts src/preload/preload.test.ts src/preload/preload.contract.test.ts src/main/main.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `git diff --check`

## 剩余风险

- 相对 Markdown 链接的文件跳转仍未实现，后续需要另行定界。
- 当前没有链接编辑弹窗或悬浮工具栏，链接修改仍通过源码态直接编辑。
