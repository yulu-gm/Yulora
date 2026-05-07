# TASK-019 导出 HTML

日期：2026-05-06
状态：DEV_DONE

## 本轮完成内容

- 已将 2026-05-05 落地的 ad-hoc HTML export 合并回 `TASK-019` 的任务真相。
- `File` 菜单提供 `Export HTML...`，renderer 会从当前活动 Markdown 文档生成 standalone HTML。
- 导出 HTML 会内联当前可读 CSS、主题 root attributes，并复用 FishMark 阅读态 class contract 渲染 heading、paragraph、list、blockquote、code block、table、image 与 inline marks。
- main/preload/shared 已提供受限 `exportHtmlFile` IPC，主进程负责导出目标路径选择和 HTML 文件写入。
- 导出流程独立于 Markdown 保存，不会改变当前 Markdown 文件路径，也不会清除 dirty 状态。

## 主要改动文件

- `src/shared/export-html-file.ts`
- `src/main/export-html-file.ts`
- `src/renderer/export-html.ts`
- `src/shared/menu-command.ts`
- `src/main/application-menu.ts`
- `src/main/main.ts`
- `src/preload/preload.ts`
- `src/shared/product-bridge.ts`
- `src/renderer/editor/useEditorApplicationController.ts`
- `src/renderer/editor/App.tsx`
- `MVP_BACKLOG.md`
- `docs/progress.md`

## 已验证内容

- `src/main/export-html-file.test.ts` 覆盖导出写入、取消与失败映射。
- `src/preload/preload.test.ts` / `src/preload/preload.contract.test.ts` 覆盖 export bridge contract。
- `src/renderer/export-html.test.ts` 覆盖 standalone HTML shell、CSS/theme 内联、基础 Markdown 渲染、图片、表格和空行契约。
- 2026-05-05 handoff 已记录 focused test、typecheck、lint、build 与人工 scrollbar probe。
- 2026-05-06 review cleanup 复跑 `npm.cmd run test`、`npm.cmd run lint`、`npm.cmd run typecheck`、`npm.cmd run build` 均通过；build 仍保留 Vite chunk-size warning。

## 剩余风险

- 导出 HTML 是静态 renderer，不是序列化 CodeMirror DOM；后续阅读态 decoration 变化需要同步 `src/renderer/export-html.ts`。
- 代码块导出当前是基础展示，不提供完整语法 tokenization。
- 本地图片当前输出为 Markdown/HTML 中的路径或 URL，尚未内嵌图片字节。
