# TASK-027 测试运行器与步骤状态机

状态：DEV_DONE
日期：2026-04-15

## 交付范围

- 新增 `packages/test-harness/src/runner.ts`，作为工作台与 CLI 共用的唯一运行器入口：
  - 场景级状态机：`idle → running → passed | failed | timed-out | interrupted`
  - 步骤级状态机：`pending → running → passed | failed | timed-out | skipped`
  - 运行上下文 `RunContext` 向 step handler 暴露 `scenarioId`、当前 `step`、`AbortSignal`
  - 终态处理：
    - 成功：所有 step 通过
    - 失败：handler 抛错或缺少 handler（`error.kind = "step" | "config"`）
    - 超时：`stepTimeoutMs` 到期，当前步标记 `timed-out`，中止 handler 的内部 signal
    - 中断：外部 `signal` abort，当前步记为 `skipped`，场景落到 `interrupted`
  - 终态触发后立即停止执行，未跑的步骤统一标记为 `skipped`
  - 结构化事件流 `RunnerEvent`：`scenario-start / step-start / step-end / scenario-end`，供 TASK-028 工作台面板与 TASK-029 CLI 消费
- `index.ts` 导出 `runScenario` 及全部运行器类型
- 单元测试 `packages/test-harness/src/runner.test.ts` 覆盖 7 条用例：
  全通过、失败停止后续步骤、超时终态、运行中断、预先中止、缺失 handler 配置错误、事件流顺序

## 验收对照

| 验收项 | 状态 |
| --- | --- |
| 同一场景可以被统一运行器执行 | ✅ `runScenario(scenario, { handlers })` 为唯一入口 |
| 工作台能读取运行状态变化 | ✅ `onEvent` 回调 + 结构化 `RunnerEvent` + `ScenarioResult.steps[]` 状态快照 |
| 失败、超时、中断都有显式终态 | ✅ `ScenarioStatus` 包含 `failed / timed-out / interrupted`，`error.kind` 区分 `step / config / timeout / abort` |

## 测试与门禁

- `npm run lint`：通过
- `npm run typecheck`：通过（三套 tsconfig）
- `npm test`：14 test files / 74 tests 全绿（runner 新增 7 条）

## 后续衔接

- TASK-028 将 `onEvent` 流接到 renderer debug 面板；`StepResult.durationMs` 与 `RunnerEvent.error` 可直接驱动步骤耗时/错误展示
- TASK-029 CLI 把 `ScenarioResult.status` 映射到退出码（0/1/2/3/4），并把事件流序列化到 `step-trace.json`
- TASK-031 新增场景时需同时提供 `StepHandlerMap`；step handler 可通过 `ctx.signal` 协作响应超时与中断
