# 子列表编辑态零位移 Handoff

## 改了什么

- 在 `docs/standards/markdown-text-rendering-standard.json` 中新增 active/inactive list content start 零位移硬规则，明确 active 子列表不得使用字符数或 `ch` 宽度抵消源码前缀。
- 追加 active marker column 硬规则：active marker 的列位置必须与 inactive marker 完全一致，ordered marker 的 glyph right edge 不得移动。
- 新增 `npm.cmd run test:list-geometry`，通过 Vite + Electron/Chromium 真实渲染 probe 测量 active/inactive 的 marker rect、content rect 和 line rect。
- 补充标准测试、CSS contract 测试、decoration 结构测试、renderer 回归和真实几何 probe，覆盖 active child list、active continuation line、ordered marker column 与既有 inactive list 渲染。
- 修复 active list decoration：源码缩进和 marker 前缀现在分开标记；源码缩进不再参与视觉 depth，active marker 进入与 inactive 相同的绝对定位 marker column，正文继续由 list content padding 定位。
- 修复 `markdown-render.css`：active list 第一行不再让 raw source prefix 参与 inline flow；active ordered marker 与 inactive ordered marker 共用右对齐 marker column；active continuation 行折叠源码缩进并直接对齐所属 list item 内容起点。
- 更新人工测试用例和主题作者指南，加入“子列表编辑态不能产生任何位移”的要求。

## 落点文件

- `docs/standards/markdown-text-rendering-standard.json`
- `src/shared/markdown-text-rendering-standard.test.ts`
- `src/renderer/editor-source-layout.test.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/decorations/block-decorations.test.ts`
- `src/renderer/styles/markdown-render.css`
- `src/renderer/code-editor.test.ts`
- `src/renderer/app.autosave.test.ts`
- `src/renderer/list-geometry-probe.html`
- `src/renderer/list-geometry-probe.ts`
- `scripts/probe-list-geometry.mjs`
- `scripts/electron-list-geometry-main.cjs`
- `package.json`
- `docs/test-cases.md`
- `docs/theme-authoring-guide.md`
- `docs/plans/2026-05-01-list-active-zero-displacement-intake.md`
- `docs/plans/2026-05-01-list-active-zero-displacement-handoff.md`

## 推荐验证命令

- `npm.cmd run test:list-geometry`
- `npm.cmd run test -- src/shared/markdown-text-rendering-standard.test.ts src/renderer/editor-source-layout.test.ts packages/editor-core/src/decorations/block-decorations.test.ts src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts packages/markdown-engine/src/parse-block-map.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check -- package.json scripts/probe-list-geometry.mjs scripts/electron-list-geometry-main.cjs src/renderer/list-geometry-probe.html src/renderer/list-geometry-probe.ts docs/standards/markdown-text-rendering-standard.json docs/test-cases.md docs/theme-authoring-guide.md docs/test-report.md docs/plans/2026-05-01-list-active-zero-displacement-intake.md docs/plans/2026-05-01-list-active-zero-displacement-handoff.md packages/editor-core/src/decorations/block-decorations.ts packages/editor-core/src/decorations/block-decorations.test.ts src/renderer/styles/markdown-render.css src/renderer/editor-source-layout.test.ts src/renderer/code-editor.test.ts src/renderer/app.autosave.test.ts src/shared/markdown-text-rendering-standard.test.ts`

## 人工验收草稿

1. 启动 FishMark，输入：
   ```md
   - parent
     - child
       - grandchild
   ```
2. 把光标依次放到 `child`、`grandchild` 内容中，观察 active 编辑态正文起点。
3. 把光标移到列表外普通段落，观察 inactive 阅读态正文起点。
4. 在较窄窗口下重复，确认软换行仍与同一列表项正文起点对齐。

## 已知风险或未做项

- 本轮未改动列表 parser 或层级编辑命令，只修 active/inactive list presentation geometry。
- 全仓 `git diff --check` 当前会被既有脏文件 `tmp/test.md` 的 trailing whitespace 阻塞；本轮触碰文件的 scoped diff check 已通过。
- 本轮是无 backlog id 的用户直达修复，因此未更新 `MVP_BACKLOG.md`、`docs/progress.md` 或 `reports/task-summaries/TASK-xxx.md`。
