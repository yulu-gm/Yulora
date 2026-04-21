---
name: fishmark-task-acceptance
description: 用于对已经实现完成的 FishMark task 做验收、跑质量门禁、判断 PASS 或 FAIL、更新项目记录，并输出人工验收步骤；仅在实现已落地、需要收尾和对外总结时使用。
---

# FishMark 任务验收

## 职责边界

只做四件事：
1. 跑本轮新鲜验证证据
2. 对照 backlog、acceptance 和 test-cases 判 `PASS / FAIL`
3. 同步项目记录
4. 输出最终总结，且必须包含人工验收步骤

不写实现代码，不补主体功能。验收中如果发现需要改实现，退回 `$fishmark-task-execution`。

## 验收流程

### 1. 先读 handoff，而不是反推实现

优先读：
- `docs/plans/<YYYY-MM-DD>-<task>-intake.md`
- `docs/plans/<YYYY-MM-DD>-<task>-handoff.md`

如果没有 handoff，再按 `AGENTS.md`、`MVP_BACKLOG.md`、`docs/acceptance.md`、`docs/test-cases.md`、`docs/progress.md` 做最小重建。

### 2. 跑本轮验证

必须使用本轮真实跑出来的证据，不能用“之前跑过”代替。

至少对照：
- `MVP_BACKLOG.md` 里的 task 验收语句
- `docs/acceptance.md` 的产品基线
- `docs/test-cases.md` 的相关场景

### 3. 判 PASS / FAIL

结论只能写：
- `PASS`
- `FAIL`

不写“基本通过”“大体 OK”之类模糊结论。

### 4. 同步项目记录

至少更新：
- `docs/test-report.md`
- `reports/task-summaries/TASK-xxx.md`

按变更影响补充更新：
- `docs/decision-log.md`
- `docs/progress.md`
- `docs/design.md`
- `docs/test-cases.md`
- `MVP_BACKLOG.md`

### 5. 文档一致性门槛

文档一致性是验收门禁的一部分。

如果以下三处在 task 状态、执行切片、或“本轮做了什么”上互相矛盾，则本轮验收**未完成**，不能直接给 `PASS`：
- `MVP_BACKLOG.md`
- `docs/progress.md`
- `reports/task-summaries/TASK-xxx.md`

必须先把这三处同步到一致，再输出验收结论。

补充规则：
- `docs/acceptance.md` 是产品验收基线，不是动态进度板
- 不要用 `docs/acceptance.md` 覆盖 backlog / progress 的动态状态真相
- 如果 task 已完成，必须检查 `MVP_BACKLOG.md` 里的执行切片 checkbox 是否已经同步

### 6. 输出最终总结

模板：

```md
Task: TASK-xxx
结果：PASS / FAIL

完成内容：
- ...

验证：
- 命令 1（已运行，结果 ...）
- 命令 2（已运行，结果 ...）

人工验收：
1. ...
2. ...

剩余风险或未覆盖项：
- ...
```

人工验收步骤不能省略。

## 结束条件

满足以下全部条件才算验收结束：
- 本轮验证证据完整且来自本轮
- `PASS / FAIL` 已写明
- 项目记录已按矩阵更新
- `MVP_BACKLOG.md`、`docs/progress.md`、`reports/task-summaries/TASK-xxx.md` 已无状态矛盾
- 最终总结已包含人工验收步骤
