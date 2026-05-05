# TASK-006 总结

日期：2026-05-02

完成内容：
- 新增 main 进程最近文件持久化服务，记录成功打开、保存和另存为的 Markdown 路径，并按配置上限去重裁剪。
- 新增受限 preload bridge：读取最近文件、清理单个失效项、订阅最近文件变化。
- 在空工作区展示最近文件列表，点击后复用现有 workspace open flow；打开失败会清理对应最近文件项。
- 设置页最近文件上限改为可编辑，`recentFiles.maxEntries = 0` 时列表为空。
- 同步更新 backlog、进度、设计、验收、测试用例和决策记录。

验证结果：
- `npm run test -- src/shared/recent-files.test.ts src/main/recent-files-service.test.ts src/preload/preload.contract.test.ts src/renderer/editor/useEditorApplicationController.test.tsx src/renderer/editor/WorkspaceShell.test.tsx` 通过
- `npm run test -- src/renderer/app.autosave.test.ts src/renderer/test-workbench.test.tsx` 通过
- `npm run typecheck` 通过
- `npm run lint` 通过，保留既有 Fast Refresh warning
- `npm run build` 通过，保留既有 Vite chunk size warning
- `npm run test` 默认全量阻塞：多个 unrelated 文件出现 worker / timeout；失败文件单独重跑通过

人工验收：
1. 打开一个 `.md` 文件后回到空工作区，确认最近文件列表显示该文件。
2. 点击最近文件项，确认该文件重新打开。
3. 删除或移动某个最近文件路径后点击该项，确认失败提示出现且该项被清理。
4. 在设置页调整最近文件上限，确认列表按上限显示。

剩余风险：
- 尚未在真实 Electron 窗口中完成手工文件移动 / 删除验收。
- 默认全量 Vitest runner 在当前环境仍有超时风险，本轮不能把 `npm run test` 记为 PASS。
- 本任务不包含崩溃恢复或 workspace session restore。
