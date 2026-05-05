# open-file-overwrite-guard 总结

日期：2026-05-01

完成内容：
- 修复保存 / autosave 异步收尾在活动 tab 已变化时，仍读取当前 editor 内容并 flush 到新活动 tab 的数据丢失风险。
- `useWorkspaceController.refreshWorkspaceSnapshot()` 增加是否保留活动 draft 的选项。
- `useSaveController` 在保存发起时捕获 `tabId`，只有保存完成时仍是同一活动 tab 才执行 draft flush / preserve。
- 新增 controller 回归测试，覆盖保存进行中切到第二个 tab 后，旧内容不能写入新活动 tab。
- 追加修复打开新文件成功后的程序化 blur：打开后主动 blur editor 不再触发 autosave，避免新 tab 已激活但 CodeMirror 还没装载新内容时，把上一份 buffer 写入 `test.md` 这类刚打开的文件。
- 新增 App 整合回归测试，覆盖打开第二个文件期间旧 buffer 不能被同步或保存到新 tab。

验证结果：
- `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "does not autosave the previous editor buffer into a newly opened document during open blur"` 先失败、修复后通过，1 项测试通过。
- `npm.cmd run test -- src/renderer/app.autosave.test.ts src/renderer/editor/useWorkspaceController.test.tsx src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/editor/useSaveController.test.tsx` 通过，161 项测试通过。
- `npm.cmd run typecheck` 通过。
- `npm.cmd run test -- src/renderer/editor/useEditorApplicationController.test.tsx` 通过，3 项测试通过。
- `npm.cmd run test -- src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/app.autosave.test.ts src/main/workspace-service.test.ts` 通过，157 项测试通过。
- `npm.cmd run typecheck` 通过。
- `npm.cmd run lint` 通过，保留既有 `src/renderer/editor/App.tsx` Fast Refresh warning。
- `npm.cmd run test` 通过，90 个测试文件、863 项测试通过。
- `npm.cmd run build` 通过，保留既有 Vite chunk size warning。

人工验收：
1. 打开文件 A，输入能明显识别的内容并触发保存或 autosave。
2. 立刻打开文件 B。
3. 确认 B 显示自己的磁盘内容，不显示 A 的内容。
4. 等待超过 autosave idle delay 后，从磁盘读取 B，确认 B 没有被 A 覆盖。
5. 切回 A，确认 A 的内容和保存状态符合预期。

说明：
- 本轮是高危数据安全 bugfix，不更新 `MVP_BACKLOG.md` 和 `docs/progress.md` 的正式 task 状态。
- 工作区存在其他未提交改动，本轮未回滚、未吸收无关变更。
