# TASK-015 图片粘贴

日期：2026-04-17
状态：DEV_DONE

## 本轮完成内容

- 新增受限的剪贴板图片导入链路：仅允许已保存文档导入图片，资源会写入当前文档同级 `assets/` 目录
- 图片文件名采用 `<document-base>-image-<timestamp>`，冲突时自动追加递增后缀
- renderer 在检测到图片粘贴时会阻止默认文本粘贴，调用 bridge 导入成功后插入相对路径 Markdown
- `editor-core` 基于现有 `image` inline AST 增加图片 preview widget
- 非激活态会直接把图片 Markdown 折叠成预览；激活态保留 Markdown 源码，并在源码下方继续显示图片
- 补齐开发态本地图片加载链路：预览 URL 不再直接暴露 `file://`，而是统一走 `yulora-asset://` 受控协议，避免 `http://localhost` renderer 加载本地图片失败
- 新增 top-level `htmlFlow` 中纯图片场景的 `htmlImage` block，让 HTML `<img ...>` 与 `<p><img ...></p>` 也能走同一条预览链，并应用 `zoom` / `width` / `align` 等基础展示属性
- 图片预览样式从大卡片收敛为更接近 Typora 的正文流布局：默认居中、去掉额外背景与包裹边框
- 点击任意图片预览时，编辑器会直接聚焦并把光标跳回对应图片源码起点，方便立即继续编辑 Markdown / HTML 源码

## 主要改动文件

- `src/shared/clipboard-image-import.ts`
- `src/main/clipboard-image-import.ts`
- `src/main/clipboard-image-import.test.ts`
- `src/main/main.ts`
- `src/main/preview-asset-protocol.ts`
- `src/preload/preload.ts`
- `src/preload/preload.contract.test.ts`
- `src/renderer/types.d.ts`
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/code-editor-view.tsx`
- `src/renderer/code-editor-view.test.tsx`
- `src/renderer/editor/App.tsx`
- `src/renderer/styles/markdown-render.css`
- `src/shared/preview-asset-url.ts`
- `packages/markdown-engine/src/html-image.ts`
- `packages/markdown-engine/src/block-map.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/parse-block-map.test.ts`
- `packages/editor-core/src/decorations/image-widgets.ts`
- `packages/editor-core/src/decorations/inline-decorations.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/decorations/block-decorations.test.ts`
- `packages/editor-core/src/derived-state/inactive-block-decorations.ts`
- `packages/editor-core/src/extensions/markdown.ts`
- `packages/editor-core/src/index.ts`
- `MVP_BACKLOG.md`
- `docs/progress.md`
- `docs/decision-log.md`
- `docs/test-cases.md`

## 已验证内容

- `npm.cmd run test -- src/main/clipboard-image-import.test.ts src/preload/preload.contract.test.ts src/renderer/code-editor.test.ts`
- `npm.cmd run test -- packages/editor-core/src/decorations/block-decorations.test.ts packages/editor-core/src/derived-state/inactive-block-decorations.test.ts packages/editor-core/src/extensions/markdown.test.ts src/renderer/code-editor-view.test.tsx src/renderer/app.autosave.test.ts src/renderer/test-workbench.test.tsx`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`
- 全量 Vitest 当前为 `51` 个文件、`349` 条测试通过

## 剩余风险

- 当前只支持剪贴板导入，不包含拖放；拖入图片仍由 `TASK-016` 承接
- 未保存文档会明确拒绝图片导入；若后续要支持 untitled 文档图片资源，需要与临时资源目录或首次保存迁移策略一起设计
- 远程图片、reference-style image 与图片尺寸编辑 UI 仍未纳入本轮范围
- 当前 HTML 图片只覆盖 top-level、纯图片 `htmlFlow` 场景；更复杂的混合 HTML、caption、figure 与任意嵌套容器仍未纳入本轮范围
