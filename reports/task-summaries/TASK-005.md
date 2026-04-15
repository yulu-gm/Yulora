# TASK-005 总结

日期：2026-04-15

完成内容：
- 在 `src/renderer/App.tsx` 中接入 autosave 调度，支持停止输入后的 idle autosave 与编辑器失焦后的 blur autosave
- 扩展 `src/renderer/document-state.ts`，区分 `manual-saving` 与 `autosaving` 两类保存状态
- 在 `src/renderer/code-editor.ts` 与 `src/renderer/code-editor-view.tsx` 中补充 editor blur 事件透传，但不把持久化逻辑下沉到 editor 边界
- 新增 `src/renderer/app.autosave.test.ts`，覆盖 idle/blur autosave、定时器重置、手动保存优先级，以及保存进行中再次编辑后的 replay autosave
- 调整 `tsconfig.vitest.json`，补齐 vitest 对 JSX 测试依赖的编译配置

验证结果：
- `npm run test -- src/renderer/document-state.test.ts src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts` 通过
- `npm run lint` 通过
- `npm run typecheck` 通过
- `npm run test` 通过
- `npm run build` 通过

人工验收建议：
- 打开一个已有 `.md` 文件后编辑文本，确认停止输入约 1 秒后文件会自动写回磁盘
- 再次编辑文本并让编辑器失焦，确认会立即触发 autosave
- 触发一次保存失败，确认界面提示 autosave 失败但当前内容仍保留且状态保持未保存
- 确认 `File > Save` 与 `File > Save As...` 仍然可用，且不会被 pending autosave 干扰

说明：
- 本任务只覆盖“已有路径的已打开文档”的 autosave，不包含未命名新文档、崩溃恢复或窗口关闭拦截
- autosave 继续复用 `TASK-004` 的保存链路，没有新增 renderer 直写文件系统的能力
