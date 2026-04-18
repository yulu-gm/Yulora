# Table Rendering Design

Date: 2026-04-18

## Task

为 Yulora 增加首版表格渲染与表格内直接编辑能力。

## Goal

让常见 GFM pipe table 在编辑器中始终以表格形态呈现，而不是在激活时回退到原始 Markdown 源码态。用户应能直接在单元格内编辑内容，并通过 rail 中的紧凑工具列完成增删行列、删除整表等结构操作。底层 Markdown 仍是唯一事实来源，但表格在每次编辑后都会即时重排为统一、整齐的对齐格式。

## Context

当前 Yulora 的 heading、paragraph、list、blockquote、code fence、image 都建立在 `markdown-engine -> editor-core decorations -> renderer shell` 这条链路上。现有 block rendering 以“非激活态渲染、激活态回源码”为主，但这不适合表格，因为目标体验要求：

- 光标进入表格后仍看到表格
- 单元格内直接编辑内容
- `Tab / Shift+Tab` 像表格编辑器一样在单元格之间导航
- `Ctrl+Enter` 在下方新增一行
- rail 中出现表格工具，并带有动态过渡而不是硬切

这意味着表格需要成为首个“始终渲染”的块级编辑模型，但仍必须继续遵守：

- Markdown 文本是唯一事实来源
- renderer 不维护第二份文档真相
- main / preload / renderer 分层不被破坏
- IME、光标映射、undo/redo 风险必须被显式控制

## In Scope

- 识别并解析常见 pipe table 写法
- 新增 top-level `table` block
- 表格始终以 widget/table 视图呈现
- 单元格内直接编辑文本
- `Tab` / `Shift+Tab` 单元格导航
- `Ctrl+Enter` 在当前行下方新增行，并保持当前列
- rail 显示紧凑型 table utility actions
- rail 的表格工具出现/消失带过渡动画
- 每次单元格编辑与结构编辑后都即时重排整张表的 Markdown 样式
- 对 parser、编辑行为、rail 切换和关键交互补测试

## Out Of Scope

- HTML table
- rowspan / colspan
- 表格内嵌块级内容
- 表格专用浮层或弹窗编辑器
- CSV 导入导出
- 列宽手动拖拽
- 单元格公式、排序、筛选

## Supported Syntax

首版支持常见 GFM pipe table 变体，包括：

- 有外侧 `|` 的写法
- 无外侧 `|` 的写法
- 常见对齐分隔符：`---`、`:---`、`---:`、`:---:`
- 空单元格
- header + delimiter + body 的常见组合

解析后统一收敛到 canonical table model，再由 formatter 输出规范化 Markdown。

## Key Decisions

### 1. 表格不回源码态

表格块在非激活和激活状态下都保持表格视图，不再沿用现有 block 的“激活即回源码态”策略。这样才能让单元格编辑、键盘导航和 rail 工具保持稳定心智。

### 2. Markdown 仍是唯一事实来源

widget 不持久保留第二份文档。任意单元格输入、快捷键或 rail 操作，都统一走：

`table model -> formatTableMarkdown() -> replace source range in main document`

随后依赖现有派生链重新解析和重渲染。

### 3. 每次编辑都自动重排整张表

用户已经确认首版采用“持续自动整理表格样式”。因此：

- 单元格文本变更后即时重排
- 增删行列后即时重排
- 分隔线、列宽、空格风格统一

这会牺牲原始表格空格样式保真，但保留表格语义和内容 round-trip。

### 4. rail 使用 Dense Utility Rail

当光标位于表格单元格内时，左侧 rail 切换为紧凑工具列，按从上到下固定顺序显示：

- `+ Row Above`
- `+ Row Below`
- `+ Col Left`
- `+ Col Right`
- `- Row`
- `- Col`
- `- Table`

### 5. rail 切换必须带过渡

表格工具出现时不能硬切。采用和现有 outline/settings 类似的“延迟卸载 + 过渡态”思路，但更轻量：

- rail 常驻容器不卸载
- 普通 rail 内容与 table rail 内容通过 `data-state="entering|open|closing|hidden"` 驱动动画
- 使用 opacity、translateY、filter/blur 的轻量组合过渡
- 动效时长保持短促，避免拖慢连续编辑

目标观感是“rail 进入 table mode 时自然滑入并接手”，而不是瞬间替换。

## Architecture

### markdown-engine

新增 `table` top-level block，输出最小但稳定的结构：

- source range
- line range
- column count
- alignment per column
- header cells
- body rows
- 每个 cell 的 normalized text/value range metadata

parser 只负责识别和结构化，不负责 UI 交互。

### editor-core

新增 table-specific block widget，而不是延续 line decoration。table widget 负责：

- 绘制表格 DOM
- 管理当前活动 cell 坐标
- 处理 cell 输入事件
- 触发结构编辑命令
- 将编辑结果回写为 Markdown source replacement

editor-core 继续拥有编辑语义，renderer 不直接理解 Markdown 表格细节。

### renderer

renderer 只消费最小 UI 状态：

- 当前 active block 是否为 `table`
- 当前表格上下文是否有活动 cell
- 当前 cell 的 row / column 坐标

`src/renderer/editor/App.tsx` 根据这个状态把常驻 rail 切换到 table utility rail，并播放进入/退出过渡。

## Editing Model

### Cell Editing

- 点击单元格：聚焦该 cell
- 单元格内文本可直接编辑
- 每次提交变更都重算表格 Markdown 并立即更新文档
- 变更后光标需要映射回同一逻辑 cell 的对应文本位置

### Keyboard

- `Tab`：跳到右侧单元格；若当前为行尾，跳到下一行首列
- `Shift+Tab`：跳到左侧单元格；若当前为行首，跳到上一行末列
- `Ctrl+Enter`：在当前行下方插入新行，并把焦点放到新行的同列

首版不额外定义更多表格专属快捷键，避免过早扩张。

### Rail Actions

rail 中按钮统一映射到 table model commands：

- insert row above
- insert row below
- insert column left
- insert column right
- delete current row
- delete current column
- delete table

执行后：

- 即时重排 Markdown
- 保持焦点留在最合理的相邻 cell
- 删除整表时把光标移回表格原起点附近的正文位置

## Data Flow

1. `markdown-engine` 解析 source，识别 top-level `table`
2. `editor-core` 为该 block 生成 table widget
3. 用户在 cell 内输入或触发结构操作
4. widget 基于 current table model 生成 next table model
5. formatter 输出 canonical Markdown table
6. 编辑器以 block source range 为边界替换原文
7. 文档重新进入现有 parse / active-block / render 派生链
8. 新表格重新挂载，并把 selection 映射回目标 cell
9. renderer 根据 active table context 播放 rail 进入/退出过渡

## Formatting Strategy

formatter 输出统一风格：

- 始终补齐外侧 `|`
- cell 两侧统一使用单个空格
- 分隔线依据 alignment 输出 `---` / `:---` / `---:` / `:---:`
- 列宽按当前所有 header/body cell 可见文本最大宽度计算

这让源码和视觉持续一致，也让后续增删行列命令更容易保持稳定。

## Motion And UX

### Table Rail Transition

- 进入 table mode：rail 工具从轻微下移位置淡入，旧 rail 内容同时轻微上移并淡出
- 退出 table mode：反向播放
- 动效只作用于 rail 内容层，不改变整个 app shell 布局
- 过渡期间按钮不可重复触发未完成态，避免状态闪烁

### Editor Stability

- 表格视图切换不能引发布局抖动
- 连续 `Tab` 时 rail 不应重复闪烁
- 同一表格内移动 cell 时 rail 只更新上下文，不重复 enter/exit

## Testing

### markdown-engine

- parser tests for common pipe table variants
- alignment parsing
- CRLF and EOF boundaries
- canonical row/column count

### editor-core

- cell navigation via `Tab` / `Shift+Tab`
- `Ctrl+Enter` row insertion
- add/delete row/column
- delete table
- source rewrite after each edit
- selection remapping after table reformat

### renderer

- rail enters table mode with animated state attributes
- rail exits table mode without hard cut
- table actions dispatched from rail update document and preserve focus

### Manual Acceptance

在 `docs/test-cases.md` 补充表格场景，至少覆盖：

- 中文输入法下单元格编辑
- 连续 `Tab` / `Shift+Tab`
- 连续 `Ctrl+Enter`
- 连续增删行列
- 自动重排后焦点仍在预期单元格
- rail 工具切入/退出没有硬切和明显闪烁

## Risks

### IME Stability

如果 table widget 内的输入路径绕过现有 composition guard，最容易引入吞字和跳光标问题。这是首要风险。

### Selection Mapping

因为每次编辑都会重写整张表，必须保证“逻辑 cell -> 新 source offsets”的映射稳定，否则会出现跳格或光标丢失。

### Source Churn

整表自动对齐意味着 source diff 会比普通文本编辑更大。首版必须在文档中明确这是有意设计，而不是 round-trip 缺陷。

### Scope Expansion

表格天然容易扩到 merge cells、toolbar、drag handle、Markdown 方言差异。首版必须严格停在 top-level canonical pipe table。

## Landing Area

- `packages/markdown-engine/src/block-map.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/parse-markdown-document.ts`
- `packages/markdown-engine` 对应测试
- `packages/editor-core/src/decorations/*`
- `packages/editor-core/src/extensions/markdown.ts`
- `packages/editor-core` 对应测试
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/editor/App.tsx`
- rail 相关样式文件
- `docs/decision-log.md`
- `docs/test-cases.md`

## Acceptance

当以下条件同时满足时，本轮设计视为可进入实现计划：

- 常见 GFM pipe table 能被识别为 top-level `table` block
- 表格在激活和非激活时都保持表格视图
- 单元格可直接编辑
- `Tab / Shift+Tab / Ctrl+Enter` 行为符合设计
- rail 能显示 dense table utility actions，且带平滑过渡
- 每次编辑后 Markdown table 即时重排并保持可读
- 测试方案覆盖 parser、交互、rail 和 IME 关键风险
