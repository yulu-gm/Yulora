# 子列表编辑态零位移 Intake

## 背景

用户反馈：光标落在子列表上时，子列表从阅读态切到编辑态会产生水平位移，且层级越深位移幅度越不一致。

当前列表渲染标准已经规定 list depth、marker gap、content start 和 active hanging indent，但没有把“active 子列表正文起点与 inactive 阅读态正文起点必须完全重合”作为单独硬性规则写明。

## 根因方向

- inactive list 行通过 `depthOffset + contentOffset` 定位正文起点，并把 Markdown 源码缩进/marker 从文本流隐藏或替换。
- active list 行同样有 `depthOffset + contentOffset` padding，但再用 `sourcePrefixLength ch` 作为负 `text-indent` 抵消源码前缀。
- `ch` 是字体度量，不等于真实空格、marker、任务 marker 的视觉宽度；子列表层级越深，源码前缀越长，误差就越大。

## 本轮规则

- 子列表 active 编辑态和 inactive 阅读态的正文起点必须完全一致。
- 位移容忍度为 `0px`；不允许随着 depth 增加产生层级相关误差。
- active 行可以显示 Markdown marker，但 raw source indent 不得参与视觉 depth 计算。
- continuation 行和软换行继续以所属列表项正文起点为对齐 anchor。

## 落点

- `docs/standards/markdown-text-rendering-standard.json`
- `src/shared/markdown-text-rendering-standard.test.ts`
- `src/renderer/editor-source-layout.test.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/decorations/block-decorations.test.ts`
- `src/renderer/styles/markdown-render.css`
- `src/renderer/code-editor.test.ts`
- `src/renderer/app.autosave.test.ts`
- `docs/test-cases.md`
- `docs/theme-authoring-guide.md`

## 验收重点

- 标准 JSON 明确 active/inactive content start 零位移规则。
- CSS contract 禁止 active 子列表继续使用 `ch` 字符宽度抵消源码前缀。
- decoration 层把 active source indent、active source marker prefix 和 continuation source prefix 分开标记。
- renderer 回归确认 active 子列表 DOM class/style 与 inactive marker 渲染都保持稳定。
