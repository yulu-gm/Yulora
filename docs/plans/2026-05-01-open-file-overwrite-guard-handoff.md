# open-file-overwrite-guard handoff

改了什么：
- 在保存 / autosave 发起时捕获当前 `tabId`。
- 保存成功后的 workspace refresh 只在保存发起 tab 仍是活动 tab 时，才执行 `flushActiveWorkspaceDraft()` 并保留当前 editor draft。
- 如果保存完成时活动 tab 已切到别的文件，只刷新 main workspace snapshot，不读取当前 editor 内容写入新活动 tab。
- 追加修复打开文件后的程序化 blur：`File > Open...` 成功后为了退回 reading mode 主动 blur editor 时，不再触发 autosave，避免新活动 tab 已切换但 CodeMirror 仍暴露旧 buffer 的瞬间把旧内容写入新文件。
- 新增回归测试，覆盖保存进行中切换到第二个 tab 时，旧 tab 内容不能被同步到 `tab-2`。
- 新增整合回归测试，覆盖打开第二个文件时，旧 editor buffer 不能在 open blur 中 autosave 到 `tab-2` / `test.md`。

落点文件：
- `src/renderer/editor/App.tsx`
- `src/renderer/app.autosave.test.ts`
- `src/renderer/editor/useSaveController.ts`
- `src/renderer/editor/useWorkspaceController.ts`
- `src/renderer/editor/useEditorApplicationController.test.tsx`
- `docs/test-report.md`
- `docs/decision-log.md`

推荐验证命令：
- `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "does not autosave the previous editor buffer into a newly opened document during open blur"`
- `npm.cmd run test -- src/renderer/app.autosave.test.ts src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/editor/useSaveController.test.tsx`
- `npm.cmd run test -- src/renderer/editor/useEditorApplicationController.test.tsx`
- `npm.cmd run test -- src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/app.autosave.test.ts src/main/workspace-service.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`

已运行验证：
- `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "does not autosave the previous editor buffer into a newly opened document during open blur"`：先失败，确认可复现 `tab-2` 被写入 `# First\n`；修复后通过，1 项。
- `npm.cmd run test -- src/renderer/app.autosave.test.ts src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/editor/useSaveController.test.tsx`：通过，161 项。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run test -- src/renderer/editor/useEditorApplicationController.test.tsx`：通过，3 项。
- `npm.cmd run test -- src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/app.autosave.test.ts src/main/workspace-service.test.ts`：通过，157 项。
- `npm.cmd run lint`：通过，保留既有 `src/renderer/editor/App.tsx` Fast Refresh warning。
- `npm.cmd run test`：通过，90 个文件、863 项。
- `npm.cmd run build`：通过，保留既有 Vite chunk size warning。

人工验收草稿：
1. 打开一个已保存文件 A，修改内容后等待或触发一次 autosave。
2. 在 autosave 或保存可能仍在进行时，立刻通过 `File > Open...` 打开文件 B。
3. 确认 B 的编辑区显示 B 的磁盘内容，不会出现 A 的内容。
4. 等待超过 autosave idle delay，再从磁盘读取 B，确认 B 没有被写成 A 的内容。
5. 切回 A，确认 A 的修改仍按原路径保存或保持 dirty 状态。

已知风险或未做项：
- 本轮只修复当前会话内保存/autosave 收尾污染活动 tab 的竞态，不实现 crash recovery 或本地历史。
- 仓库已有其他未提交改动，本轮未回滚、未吸收无关文件。
- 这是临时高危 bugfix，不更新 `MVP_BACKLOG.md` / `docs/progress.md` 正式 task 状态。

Next skill: $fishmark-task-acceptance
