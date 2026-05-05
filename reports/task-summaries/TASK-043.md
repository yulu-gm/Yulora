# TASK-043 总结

结果：PASS

## 2026-05-05 follow-up：多文件拖入覆盖防护

结果：FAIL

范围：
- 修复同时拖入多个 Markdown 文件时，刚打开的新 tab 可能被旧活动编辑器内容覆盖的竞态。
- 只收敛 renderer 批量拖入打开链路，不改 main / preload IPC contract。

本轮完成：
- 在 `useWorkspaceController` 增加批量 path-open 原语：批量开始前只 flush 一次当前活动 tab draft，随后连续打开目标路径并应用 workspace snapshot。
- 将 App 的多文件 drop 入口改为调用批量 path-open，避免在 `alpha.md` 与 `beta.md` 之间重复 flush stale CodeMirror 内容。
- 新增 controller 回归，覆盖“连续打开路径时 CodeMirror 仍停留在旧文档内容”的数据覆盖场景。
- 更新 `docs/test-cases.md` 的拖拽打开人工回归步骤，明确多文件路径、内容和保存隔离。

验证：
- `npm.cmd run test -- src/renderer/editor/useWorkspaceController.test.tsx`：通过（1 个文件、9 项）
- `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "multiple files"`：通过（1 个相关场景）
- `npm.cmd run lint`：通过（保留既有 Fast Refresh warning）
- `npm.cmd run typecheck`：通过
- `npm.cmd run build`：通过（保留既有 Vite chunk size warning）
- `npm.cmd run test`：阻塞，当前工作区既有壳层 header 移除后，`src/renderer/app.autosave.test.ts` 仍有 10 条旧断言期待 workspace header DOM/CSS。

人工验收：
1. 打开一个已有 Markdown 文档并输入未保存内容。
2. 在系统文件管理器中同时选中两个或更多 `.md` 文件，一次性拖入 FishMark。
3. 确认每个拖入文件都创建独立标签，且标题、路径、正文内容分别对应原文件。
4. 在拖入标签之间来回切换，确认不会把原活动文档或前一个拖入文件内容同步到其他标签。
5. 编辑并保存其中一个拖入标签，确认只写回该标签对应的磁盘文件。

剩余风险或未覆盖项：
- 由于全量 Vitest 被既有 workspace header 测试不一致阻塞，本 follow-up 不能给仓库级 PASS；需要先把当前壳层 header 移除改动与 `src/renderer/app.autosave.test.ts` 的旧断言对齐。

范围：
- 在 `main` / `preload` / `renderer` 之间建立标签页工作区真值与受限 IPC 契约
- 完成 `New` / `Open...` / 拖入文件 / 外部打开 / `File > New Window` 的统一标签 / 窗口决策
- 落地标签栏切换、关闭、排序、拖出成新窗口，以及 `tabId` 维度的保存 / 另存为 / autosave / 外部文件 watcher / 关闭确认

本轮完成：
- 新增并扩展 `workspace-service`、`workspace-close-coordinator` 与对应共享契约，让窗口 / 标签结构、单标签关闭和窗口关闭逐标签处理统一收敛在 `main`
- renderer 从单一 `currentDocument` 迁移到“标签栏 + 活动标签编辑器”模型，当前支持多标签新建、打开、切换、关闭、排序与拖出成新窗口，同时保持单窗口只挂一个活动编辑器实例
- 保存、另存为、autosave、外部文件 watcher 与冲突重载链路已迁移到活动 `tabId` 维度，不再只盯旧单文档心智
- 同步更新 `MVP_BACKLOG.md`、`docs/acceptance.md`、`docs/test-cases.md`、`docs/test-report.md`、`docs/decision-log.md` 与 `docs/progress.md`，保持任务状态、验收基线与回归用例一致
- follow-up 修补：外部文件冲突 banner 的“重载磁盘版本”改为原标签就地换入磁盘内容，不再额外追加同路径标签
- follow-up 修补：从窗口外一次拖入多个 Markdown 文件时，会按拖入顺序同时追加多个标签页
- follow-up 修补：主进程文件 watcher 会忽略当前活动文件由应用自身保存触发的写回事件，不再在编辑或 autosave 后误报“当前文件已被外部修改”

验证：
- `npm run test -- src/main/workspace-service.test.ts src/main/workspace-close-coordinator.test.ts src/main/save-markdown-file.test.ts src/main/application-menu.test.ts src/main/main.test.ts src/preload/preload.contract.test.ts src/preload/preload.test.ts src/renderer/document-state.test.ts src/renderer/editor-test-driver.test.ts src/renderer/app.autosave.test.ts src/renderer/test-workbench.test.tsx`：通过（11 个文件、198 条测试）
- `npm run test -- src/renderer/app.autosave.test.ts src/main/workspace-service.test.ts src/preload/preload.contract.test.ts src/renderer/test-workbench.test.tsx`：通过（4 个文件、157 条测试）
- `npm run test -- src/main/external-file-watch-service.test.ts src/renderer/app.autosave.test.ts src/main/workspace-service.test.ts src/preload/preload.contract.test.ts src/renderer/test-workbench.test.tsx`：通过（5 个文件、161 条测试）
- `npm run typecheck`：通过
- `npm run lint`：通过
- `npm run build`：通过（保留现有 Vite chunk size warning，但不阻塞本任务验收）

人工验收：
1. 运行 `npm run dev`
2. 在同一窗口依次 `Open...` 两个 Markdown 文件，再执行 `File > New`，确认当前窗口出现三个标签，且活动编辑器会随标签切换正确更新内容
3. 拖动标签调整顺序，再把其中一个标签拖出成新窗口，确认原窗口保留剩余标签，新窗口只承载被拖出的标签
4. 修改两个标签内容让它们都进入未保存状态；先关闭其中一个 dirty 标签，确认只处理该标签的未保存状态
5. 保留另一个 dirty 标签不保存，直接关闭窗口，确认窗口关闭会按该窗口中的剩余 dirty 标签逐个处理未保存状态
6. 对任一已保存标签分别验证 `Ctrl/Cmd + S`、`Save As...`、idle autosave、外部修改后的重载 / 保留路径，确认这些行为都作用在当前活动标签，而不是其他标签
7. 从系统资源管理器一次拖入两个 Markdown 文件到当前窗口，确认会同时新增两个标签；再修改其中一个文件的磁盘内容并点击“重载磁盘版本”，确认原标签被就地刷新而不是生成同路径重复标签
8. 打开一个已保存文档后直接输入内容并等待 autosave，确认不会立刻弹出“当前文件已被外部修改”；仅在真正从外部改动同一路径文件时才出现冲突提示

剩余风险或未覆盖项：
- 当前 `WorkspaceWindowSnapshot` 仍只有 `activeDocument` 携带完整正文；inactive tab 依赖 renderer 本地保留已加载过的 payload
- 直接拖进另一个已打开窗口的 renderer drop target 交互未实现；当前用户可用路径是“拖出成新窗口”，不阻塞本任务验收
