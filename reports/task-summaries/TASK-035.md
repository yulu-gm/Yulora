# TASK-035 总结

结果：PASS

范围：
- 在块级渲染启动前补齐 IME 组合输入保护基线
- 保护 autosave 成功后的光标位置，不再因为保存回写而重载整份 editor state
- 为段落、标题、列表三类高频输入场景建立回归测试

本轮完成：
- 在 `src/renderer/code-editor.ts` 中加入 composition guard，组合输入期间继续透传文档内容变化，但延后 `parseBlockMap()` 与 active-block 派生更新到 `compositionend` 后统一 flush
- 修正 `src/renderer/code-editor-view.tsx` 在 autosave 成功回写 `initialContent` 时错误重载整份 editor state 的行为，避免保存后光标跳到文档开头
- 新增 `src/renderer/code-editor-view.test.tsx`，覆盖“同一 `loadRevision` 下保存成功同步内容不应触发 `replaceDocument()`”的回归
- 更新 `docs/decision-log.md`、`docs/test-report.md`、`docs/progress.md`、`MVP_BACKLOG.md` 与本总结，保持任务状态和验收记录一致

验证：
- `npm run lint`：通过
- `npm run typecheck`：通过
- `npm run test`：通过（15 个文件、79 条测试）
- `npm run build`：通过（存在 Vite 默认的大 bundle warning，但不阻塞本任务验收）
- `manual: npm run dev`：通过，用户已确认中文 IME 在段落、标题、列表输入时不丢字、不跳光标，且 autosave 后光标不再跳到文首

人工验收：
1. 运行 `npm run dev`
2. 切换到中文输入法
3. 在普通段落中连续输入中文，确认组合期间不丢字、不跳光标
4. 在 `# ` 标题后连续输入中文，确认组合期间不丢字、不跳光标
5. 在 `- ` 列表项后连续输入中文，确认组合期间不丢字、不跳光标
6. 等待一次 idle autosave，并再失焦一次，确认 autosave 后光标不跳到文首

剩余风险或未覆盖项：
- 当前基线只覆盖段落、标题、列表三类高频输入路径
- 引用块、代码块、多光标和真实 Windows/macOS 事件差异仍留给后续任务继续扩展
- 这轮没有提前实现 `TASK-010` 到 `TASK-013` 的可见 block rendering UI
