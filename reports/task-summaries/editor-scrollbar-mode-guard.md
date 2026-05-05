# editor-scrollbar-mode-guard 总结

结果：PASS

日期：2026-05-05

完成内容：
- 修复编辑模式下点击或拖动 editor vertical scrollbar 会退出到阅读模式的问题。
- 在 `src/renderer/editor/App.tsx` 中识别 CodeMirror `.cm-scroller` 的原生 scrollbar 命中区域，让 scrollbar 交互从空白区退出编辑路径中绕开。
- 保留点击正文进入编辑模式、点击真实空白区退出编辑模式、`Esc` 退出编辑模式的既有行为。
- 扩展 `src/renderer/app.autosave.test.ts` 的 CodeMirror mock，补齐 `.cm-scroller` 几何与 scrollbar metrics。
- 新增 renderer 回归测试，锁定 editing mode 下拖动 editor scrollbar 不切换 shell mode。

验证：
- `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "keeps editing mode when the user drags the editor scrollbar"`：先失败，修复后通过。
- `npm.cmd run test -- src/renderer/app.autosave.test.ts`：通过，151 项测试。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run lint`：通过，保留既有 `src/renderer/editor/App.tsx` Fast Refresh warning。
- `npm.cmd run build`：通过，保留既有 Vite chunk-size warning。
- `npm.cmd run test`：通过，94 个测试文件、947 项测试。

人工验收：
1. 打开一个已有 Markdown 文档，确认默认进入阅读模式。
2. 点击正文进入编辑模式。
3. 拖动编辑器右侧 scrollbar，确认文档滚动且仍保持编辑模式。
4. 点击编辑器内容外的真实空白区域，确认仍会退出到阅读模式。
5. 再次进入编辑模式后按 `Esc`，确认仍会退出到阅读模式。

说明：
- 本轮是 ad-hoc bugfix，不更新 `MVP_BACKLOG.md` 和 `docs/progress.md` 的正式 task 状态。
- 工作区存在其他未提交改动，本轮未回滚、未吸收无关变更。
