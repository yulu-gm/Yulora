# TASK-028 总结

结果：DEV_DONE

范围:
- 把测试工作台里的 `Debug Stream` 和 `Test Process` 从静态占位改成真实运行状态面板
- 在 renderer 内接入 `runScenario()` 事件流，展示步骤进度、最近事件、失败原因和中断原因
- 保持普通 editor 壳不受影响，不引入新的 main / preload 调试桥接

本轮完成:
- 更新 `src/renderer/App.tsx`，在 workbench 模式下维护本地 `DebugRunState`，把 `RunnerEvent` 折叠为场景状态、当前步骤、步骤列表和最近事件流
- 为 workbench 增加 `Run Selected Scenario` 与 `Interrupt Active Run` 控件，并通过 `AbortController` 走通中断路径展示
- 让 `app-shell-startup` 可以走通通过路径，`open-markdown-file-basic` 在当前任务中保留为可观察失败路径，用于验证错误展示
- 更新 `src/renderer/scenario-catalog.tsx`，把场景选择提升为受控状态，保证目录选择与 debug 面板指向同一场景
- 更新 `src/renderer/styles.css`，补齐运行摘要、步骤追踪、事件流和终态错误块样式
- 扩充 `src/renderer/test-workbench.test.tsx`，覆盖 idle / running / failed / interrupted 四种关键状态

验证:
- `npm run test -- packages/test-harness/src/runner.test.ts src/renderer/test-workbench.test.tsx`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

人工验收:
- 运行 `npm run dev:test-workbench`
- 确认 `Debug Stream` 初始显示 `Idle` 且 `Recent events` 为空
- 选择 `app-shell-startup` 并点击 `Run Selected Scenario`，确认会显示 `Running`、当前步骤、最近事件，并在结束后显示 `Passed`
- 选择 `open-markdown-file-basic` 并点击 `Run Selected Scenario`，确认会显示 `Failed`、失败步骤和错误消息
- 再次运行任一场景，在执行中点击 `Interrupt Active Run`，确认会显示 `Interrupted` 与中断原因
- 运行 `npm run dev`，确认普通编辑器壳不受测试工作台逻辑影响

剩余不在本任务范围内:
- CLI 统一入口与退出码
- 结果工件目录与 `result.json` / `step-trace.json`
- visual-test 截图、baseline、diff 展示
- 真正的场景自动化执行器与更多真实测试场景
