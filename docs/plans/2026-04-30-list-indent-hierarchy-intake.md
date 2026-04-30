# 列表层级操作规则 Intake

## 背景

当前列表通过 `Tab` / `Shift+Tab` 快速调整层级时，无序列表在二级项继续按 `Tab` 会返回未处理状态，焦点落到外层 UI 框选，而不是继续缩进为三级列表。根因方向是列表命令对普通列表仍依赖顶层 `activeBlock.items`，没有像有序列表一样用递归 item context 处理任意深度。

## 成熟规则

### Tab 缩进

- 只在光标是空选区，且位于列表项内部时生效；多选区暂不做结构化批量缩进。
- 当前项不是当前 scope 的第一个 item 时，允许缩进为最近前序同级 item 的子项。
- 当前项是当前 scope 的唯一 item 时，不允许继续缩进，因为没有明确的前序同级父项。
- 当前项是当前 scope 的第一个 item 时，不允许缩进，因为 Markdown 列表结构没有可承载它的前序同级父项。
- 缩进的最小单位是当前 item subtree：当前项的内容、延续行和所有子列表一起右移一级，子列表相对当前项的层级不变。
- 无序列表和任务列表缩进后保留原 marker 与 task marker；有序列表缩进后，新的子 scope 从 `1` 开始归一化。
- `Tab` 必须被列表命令消费；不能在可缩进场景下泄漏给浏览器或外层 UI 焦点导航。

### Shift+Tab 反缩进

- 只在光标是空选区，且位于非顶级列表项内部时生效。
- 当前项位于顶级 scope 时，不处理 `Shift+Tab`，保留平台默认焦点行为。
- 反缩进的最小单位同样是当前 item subtree；子列表随当前项一起左移一级，保持相对层级。
- 反缩进后，当前项成为父 item 后方的同级项；父 item 原本后续的同级项保持在它之后。
- 有序列表反缩进后，源 scope 与目标 scope 都要重新编号；无序列表和任务列表不改变 marker 类型。

### 嵌套与混合列表

- 允许任意深度嵌套，只要每次操作都能找到明确的当前 scope 与目标父项。
- ordered / unordered / task list 可以混合嵌套；缩进和反缩进不强制改写列表类型。
- 操作以 Markdown 源文本为唯一事实来源，通过 parser 读取当前结构后计算文本替换。
- 操作失败时必须明确返回未处理，不做半截文本改写。

### 子列表影响范围

- `Tab` 和 `Shift+Tab` 都递归影响当前 item 的子列表，因为用户移动的是一个列表节点，而不是单行文本。
- 子列表的相对缩进保持不变：父项右移或左移一级时，子孙项跟随同样的缩进差值。
- 不跨空白行、段落或独立 list block 合并不相关结构。

## 验收测试

- 纯函数层：三级无序列表缩进、三级任务列表缩进、无序列表反缩进整棵 subtree、顶级项反缩进返回空、scope 首项缩进返回空。
- 真实编辑器层：二级无序列表项按 `Tab` 变三级且按键被消费；三级项按 `Shift+Tab` 回到二级且子项跟随。
- 既有有序列表测试继续通过，证明新规则没有破坏 ordered-list 归一化。

## 影响范围

- `packages/editor-core/src/commands/list-edits.ts`
- `packages/editor-core/src/commands/list-edits.test.ts`
- `packages/editor-core/src/commands/list-commands.ts`
- `packages/editor-core/src/extensions/markdown.test.ts`
- `src/renderer/code-editor.test.ts`

