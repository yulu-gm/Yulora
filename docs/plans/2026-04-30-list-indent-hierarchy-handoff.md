# 列表层级快捷键 Handoff

## 改了什么

- 明确 `Tab` / `Shift+Tab` 的列表层级规则，并写入 `docs/plans/2026-04-30-list-indent-hierarchy-intake.md`。
- `computeIndentListItem()` 和 `computeOutdentListItem()` 改为读取递归列表 item context，ordered / unordered / task list 共用同一套 subtree 移动语义。
- `runListIndentOnTab()` 和 `runListOutdentOnShiftTab()` 改为统一调用语义列表 edit runner，修复无序/任务列表二级项继续按 `Tab` 时按键泄漏到 UI 焦点的问题。
- 补充纯函数和 renderer 真实按键回归，覆盖二级到三级缩进、三级反缩进、任务列表 checkbox 保留、首项不可缩进和顶级不可反缩进。

## 落点文件

- `packages/editor-core/src/commands/list-edits.ts`
- `packages/editor-core/src/commands/list-edits.test.ts`
- `packages/editor-core/src/commands/list-commands.ts`
- `src/renderer/code-editor.test.ts`
- `docs/plans/2026-04-30-list-indent-hierarchy-intake.md`
- `docs/test-cases.md`
- `docs/decision-log.md`
- `docs/progress.md`
- `reports/task-summaries/TASK-012.md`

## 推荐验证命令

- `npm run test -- packages/editor-core/src/commands/list-edits.test.ts src/renderer/code-editor.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## 人工验收草稿

1. 启动应用并打开一个 Markdown 文档。
2. 输入：
   ```md
   - parent
     - child
     - leaf
   - sibling
   ```
3. 将光标放在 `leaf` 内，按 `Tab`，确认 `leaf` 变成 `child` 下的三级列表项，焦点不跳到外层 UI。
4. 将光标继续放在 `leaf` 内，按 `Shift+Tab`，确认 `leaf` 回到二级。
5. 输入任务列表，确认 `- [ ] next` 按 `Tab` 后仍保留 checkbox。
6. 尝试在当前层级第一项按 `Tab`、顶级项按 `Shift+Tab`，确认文档结构不被改写。

## 已知风险或未做项

- 本轮只覆盖空选区单项层级调整；多选区批量缩进仍未定义。
- `MVP_BACKLOG.md` 在本轮开始前已有既有脏改动，为避免覆盖用户内容，本轮未修改该文件。

