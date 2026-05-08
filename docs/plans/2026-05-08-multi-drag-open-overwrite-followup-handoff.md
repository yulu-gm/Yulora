# 多文件拖拽打开覆盖问题 follow-up handoff

Task: TASK-043 follow-up bugfix

## 根因

之前修复已经在 `useWorkspaceController.openMarkdownFromPaths()` 里实现了批量打开保护：同一批路径只在打开前 flush 一次 active draft，后续逐个打开文件时不再把当前 CodeMirror 内容重新同步到新 tab。

但真实窗口拖拽入口 `useWindowMarkdownFileDrop()` 仍然把同一批 dropped paths 拆成多个 `openMarkdownFromPath()` 调用。每次单文件打开都会再次触发 `flushActiveWorkspaceDraft()`。当第一个新文件的 workspace snapshot 已经切成 active tab、但 CodeMirror 还没有完成替换文档内容时，第二个文件打开前的 flush 会把旧 editor 内容写进第一个新 tab，导致该 tab 显示 dirty，后续保存或 autosave 就有机会把别的文件内容写到它的路径上。

## 改动

- `src/renderer/editor/useWindowMarkdownFileDrop.ts`
  - drop hook 改为调用 `openMarkdownFromPaths(targetPaths)`，不再在 hook 内逐个 replay 单文件打开。
- `src/renderer/editor/App.tsx`
  - 新增 App 层 `handleOpenMarkdownFromPaths()`，复用既有批量 controller，并保持打开成功后切回 reading mode / blur editor 的行为。
- `src/renderer/editor/useWindowMarkdownFileDrop.test.tsx`
  - 新增回归测试，先复现旧行为会拆成多个 single-file opens，再锁定同一批 dropped files 必须作为一个批量打开命令进入 controller。
- `src/renderer/app.autosave.test.ts`
  - 加强多文件 drop 用例，确认不会把当前文档内容同步进第一个 dropped tab。

## 验证

- `npm.cmd run test -- src/renderer/editor/useWindowMarkdownFileDrop.test.tsx`
- `npm.cmd run test -- src/renderer/editor/useWindowMarkdownFileDrop.test.tsx src/renderer/editor/useWorkspaceController.test.tsx`
- `npm.cmd run test -- src/renderer/app.autosave.test.ts -t "appends every dropped Markdown file"`
- `npm.cmd run test -- src/renderer/app.autosave.test.ts`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`

## 人工验收建议

1. 打开一个 Markdown 文件，确认当前 tab 干净。
2. 从文件管理器一次选中多个内容不同的 `.md` 文件拖进 FishMark 窗口。
3. 确认每个 dropped 文件都成为独立 tab，并且刚打开时没有 dirty dot。
4. 依次切换这些 tab，确认正文内容分别是自己的文件内容。
5. 修改并保存其中一个 tab，确认磁盘上只有对应文件变化，其他文件不被覆盖。

## 已知风险

- 本次修复的是窗口 drag/drop 批量入口；单个外部打开事件仍走单文件入口。
- `MVP_BACKLOG.md` 在本轮开始前已有未提交改动，本轮未修改。
