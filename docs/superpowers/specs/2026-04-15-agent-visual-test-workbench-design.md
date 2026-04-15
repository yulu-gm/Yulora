# Agent Visual Test Workbench Design

## Goal

为 Yulora 增加一个只面向开发和 agent 的独立测试子系统，让 agent 可以通过统一 CLI 入口完全接管测试，并在带界面的独立测试工作台中执行 visual-test、跟踪进度、显示调试信息并输出标准化结果工件。

## Scope

本设计覆盖：
- 独立测试工作台窗口
- 代码静态场景注册表
- 统一 CLI 触发入口
- 测试运行器与状态机
- 步骤级调试界面
- visual-test 截图与 diff 工件输出
- 结果目录与结果协议

本设计不覆盖：
- 普通产品用户可见的测试入口
- 云端测试编排
- 多人协作测试
- 远程设备农场
- 任意脚本式自定义场景编辑器

## Non-Goals

- 不把测试系统做成产品功能
- 不让 agent 直接依赖手工点击 UI 来完成测试
- 不新增第二套主应用状态管理体系
- 不用无约束脚本替代结构化场景注册表

## Context

当前仓库已经具备 Electron + React + TypeScript 的可运行骨架，并固定了 `Vitest + Playwright` 作为测试栈方向。但现有计划中的 `TASK-024` 只描述了一个最小 Playwright 冒烟测试，还不足以支撑“agent 通过统一入口完全接管测试、并带界面执行 visual-test”的目标。

因此，需要把测试从“零散命令与用例”提升为一个独立的开发子系统。

## Requirements

### Functional Requirements

1. 系统必须提供一个独立的测试工作台窗口，与主编辑器窗口分离。
2. 系统必须提供一个统一 CLI 入口，agent 只能通过该入口触发场景执行。
3. 系统必须维护一个代码静态注册的场景列表，工作台可显示全部场景。
4. 用户可以在工作台中选择场景并手动启动运行。
5. agent 可以通过 CLI 指定场景 id 自动启动运行。
6. 工作台必须显示当前执行到哪一步、总共多少步、每步状态和耗时。
7. 工作台必须显示中断原因、错误原因和失败步骤。
8. 系统必须支持带界面的 visual-test，并输出截图和 diff 工件。
9. 每次运行必须输出标准化结果目录与 `result.json`。
10. 系统必须支持至少 `PASS / FAIL / ABORTED / TIMED_OUT` 四类最终结果。

### Quality Requirements

1. 测试模块应相对独立，避免把测试执行逻辑散落在主应用各处。
2. 场景定义必须结构化，避免长期退化为随意脚本集合。
3. 运行器必须是显式状态机，不允许依赖零散布尔值拼凑运行状态。
4. 视觉测试结果必须可回放、可定位失败步骤、可查看工件。
5. 结果协议应对 agent 与人工调试都可读。

## High-Level Architecture

系统由六个主要部分组成：

1. 场景注册表
2. 测试运行器
3. 独立测试工作台窗口
4. CLI 触发入口
5. 工件输出层
6. 视觉测试执行层

### 1. 场景注册表

场景注册表是唯一的场景来源，采用代码静态注册，而不是运行时读取任意外部脚本。每个场景是一个带元数据的标准对象。

建议放置在独立测试模块内，例如：
- `packages/test-harness/src/scenarios/`
- `packages/test-harness/src/scenario-registry.ts`

### 2. 测试运行器

运行器是唯一负责推进场景执行的模块。无论是工作台手动触发还是 CLI 触发，都必须走运行器。

运行器负责：
- 场景加载
- 前置条件准备
- 步骤执行
- 状态机推进
- 事件记录
- 工件写入
- 结果归档

### 3. 独立测试工作台窗口

测试工作台是一个独立 Electron 窗口，不属于产品功能。

职责：
- 展示场景列表
- 展示场景元数据
- 展示运行状态
- 展示 debug 信息
- 展示视觉结果

### 4. CLI 触发入口

CLI 是 agent 的唯一受支持触发入口。CLI 的职责是：
- 解析参数
- 校验场景 id
- 拉起测试工作台窗口
- 把场景 id 交给运行器
- 等待结果并退出

### 5. 工件输出层

每次运行必须输出独立的工件目录，包含结果 JSON、事件流、步骤追踪、截图与错误信息。

### 6. 视觉测试执行层

视觉测试执行层提供：
- 界面驱动
- 截图能力
- 视觉对比
- diff 生成

底层可以复用 Playwright / Electron 驱动能力，但不直接把 Playwright 暴露成面向用户的产品形态。

## Module Boundaries

### New Module

新增独立测试模块：
- `packages/test-harness/`

建议职责划分：
- `packages/test-harness/src/scenario-types.ts`
- `packages/test-harness/src/scenario-registry.ts`
- `packages/test-harness/src/runner/`
- `packages/test-harness/src/artifacts/`
- `packages/test-harness/src/visual/`
- `packages/test-harness/src/cli/`

### Existing App Integration

- `src/main/`
  - 创建测试工作台窗口
  - 管理测试模式启动
  - 处理工件目录与窗口生命周期

- `src/preload/`
  - 暴露测试工作台安全 bridge
  - 提供场景查询、启动、状态订阅 API

- `src/renderer/`
  - 实现测试工作台 UI
  - 场景列表页
  - Debug 面板
  - 视觉结果面板

- `packages/editor-core/`
  - 承载可复用的测试状态模型与类型
  - 不直接承载测试执行器

- `packages/markdown-engine/`
  - 仅在某些断言和 fixture 构造时被复用

## Scenario Model

每个场景应为固定结构对象，至少包含：

- `id`
- `title`
- `description`
- `tags`
- `preconditions`
- `steps`
- `expectedArtifacts`
- `supportsVisual`
- `timeoutMs`
- `retriable`

### Example Shape

```ts
interface TestScenario {
  id: string;
  title: string;
  description: string;
  tags: string[];
  preconditions: string[];
  steps: TestStep[];
  expectedArtifacts: ArtifactKind[];
  supportsVisual: boolean;
  timeoutMs: number;
  retriable: boolean;
}
```

## Step Model

步骤类型需要标准化，避免每个场景自定义一套执行语义。

建议至少支持：
- `app`
- `fixture`
- `ui`
- `assert`
- `visual`
- `cleanup`

### Example Shape

```ts
interface TestStep {
  id: string;
  title: string;
  type: 'app' | 'fixture' | 'ui' | 'assert' | 'visual' | 'cleanup';
  description?: string;
}
```

## Runner State Machine

### Scenario-Level State

场景级状态固定为：
- `idle`
- `preparing`
- `running`
- `passed`
- `failed`
- `aborted`
- `timed_out`

### Step-Level State

步骤级状态固定为：
- `pending`
- `running`
- `passed`
- `failed`
- `skipped`
- `aborted`

### Rules

1. 同一时刻只能有一个当前运行步骤。
2. 场景在进入 `passed / failed / aborted / timed_out` 后不可继续推进。
3. 任意步骤失败后，运行器必须记录失败步骤并停止后续步骤。
4. 超时必须被记录为显式终态，而不是普通失败。
5. 中断必须保留已经产生的工件和事件轨迹。

## Debug Workbench UI

测试工作台建议包含四个主要区域：

### 1. 场景列表区

显示：
- 全部场景
- 搜索
- 标签筛选
- 最近运行结果
- 是否支持 visual-test

### 2. 场景概览区

显示：
- 标题
- 描述
- 前置条件
- 总步骤数
- 超时设置
- 预期工件

### 3. 运行追踪区

显示：
- 当前场景状态
- 当前步骤
- 每步状态
- 每步耗时
- 失败步骤
- 中断原因
- 错误信息
- 最近事件流

### 4. 视觉结果区

显示：
- 当前截图
- 期望截图
- diff 图
- 工件路径

## CLI Contract

CLI 入口建议固定为：

```bash
npm run test:scenario -- --id <scenario-id>
```

可扩展参数建议限制在：
- `--id`
- `--debug`
- `--artifacts`
- `--update-baseline`

不支持无约束任意脚本执行。

### Exit Codes

建议固定：
- `0`：通过
- `1`：断言失败或视觉比对失败
- `2`：环境准备失败
- `3`：超时
- `4`：人工中断或程序中止
- `5`：场景不存在或配置错误

## Artifact Layout

每次运行输出到独立目录，例如：

```text
.artifacts/test-runs/<timestamp>-<scenario-id>/
  result.json
  step-trace.json
  events.log
  screenshots/
    actual.png
    expected.png
    diff.png
  errors/
    stack.txt
```

### result.json Suggested Fields

- `scenarioId`
- `status`
- `startedAt`
- `endedAt`
- `durationMs`
- `currentStep`
- `failedStep`
- `errorType`
- `errorMessage`
- `artifactPaths`

## Visual Test Strategy

视觉测试必须是“带界面的测试流程”，而不只是离线截图脚本。

因此推荐策略是：
- 运行时始终拉起测试工作台窗口
- 运行器统一调度截图与视觉比对
- 工作台实时显示当前进度和视觉结果
- 结果输出到标准工件目录

Playwright 在这里是底层执行能力，而不是最终测试交互形态。

## Recommended Initial Scenarios

第一批建议接入的场景：
- `app-shell-startup`
- `open-markdown-file-basic`
- `save-markdown-file-basic`
- `open-edit-save-reopen-smoke`
- `ime-heading-input-basic`
- `export-html-smoke`

## Rollout Plan

建议按三阶段推进：

### Phase 1

建立测试工作台壳：
- 独立窗口
- 场景注册表
- CLI 入口
- 空运行追踪 UI

### Phase 2

建立运行器：
- 状态机
- 步骤执行协议
- 事件流
- 结果目录输出

### Phase 3

建立 visual-test：
- 截图
- diff
- 首批真实场景
- 结果回传与调试展示

## Risks

1. 如果测试环境不固定，visual-test 容易变脆。
2. 如果场景定义过于自由，注册表会退化为脚本堆。
3. 如果 debug UI 只是终端日志搬运，排障价值会很低。
4. 如果 agent 直接绕过 CLI 与运行器操作 UI，测试稳定性会显著下降。

## Constraints

- 保持 Electron 三层分离
- renderer 不直接获得不受限制的 Node API
- 测试系统是开发能力，不是产品功能
- 不引入与当前 MVP 方向冲突的新编辑器内核
- 不引入云端依赖

## Open Decisions Already Resolved

以下设计决策已在本轮确认：
- 测试系统仅面向开发和 agent，不作为产品功能
- 入口采用独立 Electron 测试工作台窗口
- 场景来源采用代码静态注册表
- agent 通过统一 CLI 入口触发，不依赖手工点击

## Recommendation

采用“测试工作台为主、Playwright 为底层执行引擎”的方案。

原因：
- 最符合 agent 完全接管测试的目标
- 能同时满足场景清单、CLI 入口、带界面 visual-test、调试界面和标准工件输出
- 比完全自研执行引擎成本更低
- 比把一切都绑定在 Playwright 报告页上更稳定、更可扩展