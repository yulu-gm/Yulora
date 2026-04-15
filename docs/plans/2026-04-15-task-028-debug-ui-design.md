# TASK-028 Debug UI Design

## Scope

Task: `TASK-028`
Goal: 在测试工作台中交付一个 renderer-first 的实时 debug 面板，让场景执行状态、步骤进度和错误原因能在单一窗口内被观察和排障。
In scope:
- 复用 `packages/test-harness` 现有 `runScenario()` 和 `RunnerEvent`
- 在 renderer 内维护一份面向展示的运行快照
- 为 workbench 增加场景概览区、步骤追踪区、最近事件流和终态诊断区
- 补齐 workbench 与 runner 的自动化测试
Out of scope:
- 新 IPC / preload 订阅接口
- CLI 和工件目录
- visual diff 或截图结果展示

## Approaches

### Approach A: Renderer-local view model on top of `runScenario()` event stream

由 workbench 在本地调用 `runScenario()`，用 `onEvent` 回调把事件流折叠成 UI 快照，再渲染到各个面板。

优点：
- 改动最小，直接满足当前 backlog 的 debug 展示验收
- 不引入新的 Electron 边界和安全面
- 与 `TASK-029` 的 CLI / 工件方案天然兼容，后续可复用同一事件模型

缺点：
- 目前只能覆盖 workbench 内可直接触发的运行
- 运行状态还不能跨窗口共享

### Approach B: Introduce a shared runtime store in `packages/test-harness`

在 test harness 内新增可订阅的运行时 store，renderer 只消费快照，不直接拼接事件。

优点：
- 更适合未来 CLI 和多前端消费
- 视图和执行器边界更清晰

缺点：
- 对当前任务偏重，会把 `TASK-028` 扩成半个运行平台重构
- 需要额外设计 store 生命周期和并发语义

### Approach C: Add main/preload event bridge now

先做主进程转发与 renderer 订阅，再在 workbench 显示状态。

优点：
- 为后续跨窗口和 CLI 联动提前铺路

缺点：
- 当前没有验收要求必须跨进程
- 会扩大 diff，增加 Electron 边界和测试成本

## Recommendation

采用 Approach A。`TASK-028` 的核心是把已有 runner 变成可读的实时 debug 面板，而不是提前解决跨进程编排。先在 renderer 内建立稳定的 view model，等 `TASK-029` 和 `TASK-030` 再决定是否抽成共享 store 或跨进程协议。

## Data Flow

1. workbench 选定一个场景并点击运行
2. renderer 调用 `runScenario()`
3. `runScenario()` 通过 `onEvent` 发出 `scenario-start` / `step-start` / `step-end` / `scenario-end`
4. renderer 把事件折叠成 `DebugRunState`
5. UI 从 `DebugRunState` 渲染概览、步骤列表、最近事件和终态诊断

`DebugRunState` 建议包含：
- `scenarioId`
- `status`
- `startedAt`
- `finishedAt`
- `durationMs`
- `currentStepId`
- `steps[]` with `status`, `durationMs`, `error`
- `events[]` recent first, capped
- `terminalError`

## UI Direction

- 保留 `Scenario Catalog` 作为左侧主入口
- `Debug Stream` 改为真实运行概览和事件流，而不是静态占位文案
- `Test Process` 改为步骤追踪区，显示每步状态、耗时和错误摘要
- 失败 / 中断时在显著位置展示 step id、错误类型和 message

## Error Handling

- 缺失 handler 视为配置失败，显示 `config` 错误并标出对应步骤
- 超时显示 `timed-out` 终态，保留最近事件与超时步骤
- 外部中断显示 `interrupted` 终态，保留中断原因
- 事件列表只保留最近固定数量，避免无限增长

## Testing

- 先在 `src/renderer/test-workbench.test.tsx` 写失败用例，定义运行前、运行中、失败终态和中断终态展示
- 需要时在 `packages/test-harness/src/runner.test.ts` 增补 view-model 所依赖的事件细节测试
- 完成后跑 focused tests，再跑 `lint` / `typecheck` / `build`
