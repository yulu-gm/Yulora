# Yulora Agent 长期协作手册

版本：v1.2  
日期：2026-04-15

---

## 1. 目标

这个项目不是为了“偶尔让 AI 帮忙写几行代码”，而是为了让 agent 能在清晰边界内，长期、稳定、低跑偏地推进一个真实软件项目。

关键不在于换一个更强的模型，而在于建立一个能持续交付的小闭环：
- 任务足够小
- 上下文持续稳定
- 质量门禁可重复执行
- 决策过程可追溯
- 人只在关键分叉点介入

## 2. 计划唯一来源规则

项目里关于“接下来做什么、按什么顺序做、一个任务内部怎么切”的唯一有效计划文档是 `MVP_BACKLOG.md`。

协作时遵守以下规则：
- 不创建 `v01`、`v02`、`draft`、`final` 之类的计划副本
- 计划变更直接修改 `MVP_BACKLOG.md`
- `docs/progress.md` 只记录状态，不重复描述任务拆解
- `docs/acceptance.md` 只描述产品验收基线，不替代 backlog
- 如果发现任务过大，就在原任务下面继续细化“执行切片”，而不是额外生成一份新计划

## 3. 当前最适合的协作模式

### 模式 A：本地交互式 coding agent

适合当前阶段，推荐作为主模式。

做法：
- 在本地仓库中运行 coding agent
- 让它读取 `AGENTS.md`、`docs/design.md`、`MVP_BACKLOG.md`、`docs/acceptance.md`
- 一次只推进一个 backlog task，必要时只推进其中一个执行切片
- 每次结束后写任务总结、决策记录和测试记录

为什么适合现在：
- 当前项目仍在 MVP 骨架期
- 编辑器交互和 IME 行为需要频繁人工校验
- 功能之间强相关，过早做全自动编排只会增加噪音

### 模式 B：仓库驱动的多 agent pipeline

适合后续阶段，不适合立刻切换为默认模式。

适用条件：
- 已经完成基础编辑闭环
- 测试门禁稳定
- 任务拆分成熟
- 回归成本可控

典型结构：
- Planner：从 `MVP_BACKLOG.md` 中选择一个最小可执行单元
- Implementer：只实现当前 task 或当前切片
- Reviewer：检查风险、范围和验收
- CI Gates：lint / typecheck / test / e2e / build

## 4. 长任务的执行方式

### 4.1 任务选择规则

每一轮执行前都要回答四个问题：
- 当前只做哪一个 `TASK`？
- 这轮只推进这个任务里的哪一个“执行切片”？
- 本轮明确不做什么？
- 本轮结束用什么命令或人工步骤验证？

如果这四个问题答不清楚，说明任务还不够细，应先回到 `MVP_BACKLOG.md` 继续拆。

### 4.2 单轮任务体积上限

建议把一次运行控制在以下规模：
- 单轮只推进一个目标
- 代码 diff 尽量控制在 300 到 800 行量级
- 最多跨一个核心模块加一个配套测试模块
- 若涉及 UI 交互变化，必须同时写清人工验收步骤

### 4.3 执行完成后的同步动作

每完成一个执行切片，至少同步以下内容：
- `docs/test-report.md`：记录新鲜验证证据
- `docs/decision-log.md`：记录影响后续工作的关键决策
- `reports/task-summaries/`：写本轮做了什么、剩下什么
- `docs/progress.md`：如果整个 task 状态变化了，再更新状态表

## 5. 如果继续“纯 vibe coding”，还需要哪些准备

“纯 vibe coding”可以做，但前提不是更放飞，而是把轨道铺好。

### 必须先补齐的准备

1. 固定依赖安装和启动方式  
   任何新会话都应先能执行 `npm ci`、`npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`。

2. 把 backlog 当作执行计划，而不是愿望清单  
   每个 task 都要有依赖、落点、交付物、验收和执行切片。

3. 建立真正可执行的自动化门禁  
   当前最缺的是 Playwright 冒烟流和 round-trip 回归集。

4. 固定人工必须介入的决策点  
   技术栈变更、持久化模型变更、编辑语义变更、IME 策略切换都应人工确认。

5. 保持文档角色单一  
   `MVP_BACKLOG.md` 管计划，`docs/progress.md` 管状态，`docs/acceptance.md` 管验收，避免多份文档重复指挥。

### 不建议现在就做的事

- 不要过早做全自动自治 agent pipeline
- 不要在编辑核心未稳定前并行推进多个大功能
- 不要在没有测试护栏时让 agent 连续跨任务开发
- 不要让 agent 自行改技术栈或大面积重构

## 6. 建议长期维护的文档角色

- `AGENTS.md`：agent 行为边界
- `docs/design.md`：技术方向和架构约束
- `docs/acceptance.md`：产品验收基线
- `MVP_BACKLOG.md`：唯一执行计划
- `docs/progress.md`：任务状态
- `docs/test-cases.md`：人工与回归测试场景
- `docs/test-report.md`：验证证据
- `docs/decision-log.md`：关键决策
- `reports/task-summaries/`：每轮任务总结

## 7. 最务实的下一步

如果现在就要继续推进，建议顺序是：
1. 安装依赖并恢复本地可验证环境
2. 严格按 `MVP_BACKLOG.md` 推进 `TASK-003` 的第一个执行切片
3. 完成后再进入 `TASK-004`，建立最小“打开-保存”闭环
4. 然后再进入 `TASK-007` 的 CodeMirror 6 接入
5. 最后尽快建立 `TASK-024` 的最小 Playwright 冒烟保护

原因很简单：先把文件闭环做出来，后面的编辑器体验、渲染和回归保护才有真实承载面。
