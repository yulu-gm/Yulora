# TASK-026 场景注册表与场景元数据模型

状态：DEV_DONE
日期：2026-04-15

## 交付范围

- 新增 `packages/test-harness` 工作区包，承载场景系统代码。
- 定义 `TestScenario`、`TestStep`、`TestStepKind`、`ScenarioSurface`、`ScenarioTag` 元数据模型，并提供 `assertValidScenario` / `isValidScenarioId` 校验辅助。
- 实现 `createScenarioRegistry` 工厂：
  - 插入顺序保留（即工作台列表渲染顺序）
  - 按 `tag` / `surface` / `search` 的组合过滤
  - 同 id 注册冲突在注册时抛错
  - `get` / `has` / `size` / `getTags` / `getSurfaces` 查询接口
- 预注册默认场景表 `defaultScenarioRegistry`，种子为 `app-shell-startup` 与 `open-markdown-file-basic`。
- 工作台 renderer 新增 `ScenarioCatalog` 组件，消费默认注册表，渲染列表 + 详情（元信息 / 前置条件 / 步骤），样式与现有 workbench 面板统一。
- 单元测试：
  - `packages/test-harness/src/registry.test.ts`（注册、过滤、id 校验、默认注册表断言）
  - `src/renderer/test-workbench.test.tsx` 扩展一条选择场景后详情展示的用例

## 验收对照

| 验收项 | 状态 |
| --- | --- |
| 工作台可以列出全部已注册场景 | ✅ `TestWorkbenchApp` 渲染 `ScenarioCatalog`，数量来自 `defaultScenarioRegistry.size()` |
| 每个场景有稳定唯一 id | ✅ `assertValidScenario` 强制 kebab-case，`register` 拒绝重复 id |
| 不依赖外部自由脚本即可查询场景列表 | ✅ `defaultScenarioRegistry` 为代码静态注册；`list` / `get` 即为查询接口 |

## 测试与门禁

- `npm run lint`：通过。
- `npm run typecheck`：通过（三套 tsconfig）。
- `npm test`：13 test files / 67 tests 全绿。

## 后续衔接

- TASK-027 在此基础上附加运行器与状态机，消费 `TestScenario.steps` 推进执行。
- TASK-029 CLI 应消费 `defaultScenarioRegistry` 作为唯一场景来源。
- TASK-031 扩充场景时在 `packages/test-harness/src/scenarios/` 中新增，并在 `scenarios/index.ts` 的 `seedScenarios` 末尾追加。
