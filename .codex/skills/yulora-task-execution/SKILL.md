---
name: yulora-task-execution
description: 用于执行已经定界完成的 Yulora task，适合开始实现 backlog task、继续编码、补测试、补文档落地；仅在范围已明确、可以直接动代码或文档时使用。
---

# Yulora 任务执行

## 职责边界

只负责实现：
- 写代码
- 改文档
- 补测试
- 按计划落地

不负责最终 `PASS / FAIL` 结论，不负责最终收尾总结。那些属于 `$yulora-task-acceptance`。

## 执行流程

### 1. 先读 intake handoff

优先读：
- `docs/plans/<YYYY-MM-DD>-<task>-intake.md`

如已存在，再按需补读相关设计、决策和落点文档；不要每次都全量重建上下文。

如果没有 intake handoff，先按 `AGENTS.md`、`MVP_BACKLOG.md`、`docs/acceptance.md` 做最小重建，并补一份简短 intake 到 `docs/plans/`，避免后续阶段再反推。

### 2. 在 Yulora 约束内实现

严格遵守 `AGENTS.md`：
- 一次只做一个 task
- diff 聚焦、可回退
- 不动无关文件
- 行为变化补测试或更新测试

### 3. 边做边自检

按改动范围跑开发自检，但这里的命令是开发自检，不是最终验收结论。

### 4. 落地 execution handoff

实现完成、准备交给验收前，必须写：

`docs/plans/<YYYY-MM-DD>-<task>-handoff.md`

至少包含：
- 改了什么
- 落点文件
- 推荐验证命令
- 人工验收草稿步骤
- 已知风险或未做项

### 5. 状态同步要求

如果本轮已经完成了 backlog 里的执行切片，必须同步更新：
- `MVP_BACKLOG.md` 对应 task 的执行切片 checkbox

如果本轮让 task 阶段状态发生变化，也必须同步检查：
- `docs/progress.md` 的状态表是否更新

并且在交接前检查以下三处是否互相打架：
- `MVP_BACKLOG.md`
- `docs/progress.md`
- `reports/task-summaries/TASK-xxx.md`

如果 task 状态、执行切片或“本轮完成内容”互相矛盾，要先同步文档，再交给验收；不要把状态对齐问题推给 `$yulora-task-acceptance`。

### 6. 交给验收

实现完成后，交给 `$yulora-task-acceptance`。

## 结束条件

满足以下全部条件才结束本 skill：
- 实现已落地，必要测试已补
- 开发自检已跑
- execution handoff 已写
- backlog 对应执行切片已同步更新
- `MVP_BACKLOG.md`、`docs/progress.md`、`reports/task-summaries/TASK-xxx.md` 在 task 状态上没有明显矛盾
- 已准备好交给 `$yulora-task-acceptance`
