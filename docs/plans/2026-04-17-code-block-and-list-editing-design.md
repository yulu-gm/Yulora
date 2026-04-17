# Code Block And List Editing Design

## 目标

在不改变 Markdown 文本作为唯一事实源的前提下，修正当前编辑器里 4 个与块级编辑体验直接相关的问题：

- 光标进入代码块内容时，不再整块回退成源码态，而是直接在代码块内容区编辑
- 非源码态代码块不再出现横向滚动条，改为仅视觉自动换行
- `---` 分隔符在部分 setext / frontmatter 风格场景下不再错误露出源码态
- 列表支持用 `Tab` 把当前项缩进成上一项的子列表，并同步调整当前项挂载的续行 / 子块

## 非目标

本轮不做：

- 新增 frontmatter 专门语法模型
- 新增代码块语言切换 UI
- `Shift+Tab` 反缩进
- 重写现有 block map、CodeMirror 扩展工厂或渲染架构
- 改变 Markdown 存储文本，只允许修改用户真实执行的编辑结果

## 总体方案

本轮继续沿用现有三层结构：

1. `markdown-engine`
   负责把文本解析成块映射，修正 `---` 在特定 setext 场景下的分类

2. `editor-core`
   负责 active block、块级装饰与编辑命令

3. `renderer`
   只透出测试驱动与样式，不承载新的 Markdown 语义

核心策略是“命令层补行为，装饰层补呈现，解析层补误判”，避免做横跨无关模块的大重构。

## 代码块直接编辑

### 交互目标

- 当光标落在 fenced code block 的内容行时，继续隐藏 opening / closing fence
- 内容行保持代码块视觉样式，同时仍然可直接输入、删除、换行
- 只有当用户明确把光标移动到 fence 行时，整块才回到源码态
- 保留现有“代码块后空行按 `Backspace` 进入源码态”的能力

### 设计

当前实现把“active block == codeFence”直接等同于“整块取消 inactive decorations”，因此一旦光标进入代码内容就会露出 fence 源码。

本轮把 code fence 的呈现拆成两种模式：

- `content-edit presentation`
  光标在代码内容行时，继续给 opening / closing fence 打隐藏装饰，内容行保留代码块视觉样式

- `raw fence editing`
  光标在 opening / closing fence 行时，取消这组装饰，回到完整源码态

这样可以保持 Markdown 文本不变，只改变 CodeMirror 对当前 block 的可见表示。

## 代码块自动换行

inactive / content-edit 两种代码块呈现都不应出现横向滚动条。

样式策略：

- 不改文本内容
- 使用 `white-space: pre-wrap`
- 关闭 `overflow-x: auto`
- 保留等宽字体和块级背景

这能让长代码在视觉上自动换行，同时仍保留真实文本中的换行位置。

## 分隔符误判

### 问题

`parse-block-map` 当前对 `setextHeading` 的派生拆分只对 `+++` 做了额外处理，导致类似 skill 文件开头这种 frontmatter 风格片段：

```md
---
name: xxx
description: xxx
---
```

closing `---` 仍可能被视为 setext heading underline，而不是 thematic break。

### 设计

在 setext 派生逻辑里补一个更符合 Yulora 编辑体验的规则：

- 如果 setext token 跨越多于一行正文，并且结尾行本身是显式 `---`
- 则优先把结尾行拆成 `thematicBreak`
- 前面的正文保留为 `paragraph`

这会主动牺牲少见的多行 setext heading 解析，换取更稳定的分隔符编辑体验。

## 列表 Tab 缩进

### 交互目标

- 仅当当前项不是同级第一项时，`Tab` 才生效
- 当前项缩进后成为上一项的子列表
- 如果当前项带续行、代码块、段落或已存在的子列表，这些内容要一起右移
- 只修改当前项子树，不波及后续同级兄弟项

### 设计

利用现有 `ListBlock.items` 的 `indent / startOffset / endOffset` 元数据做子树计算：

- 先找到 selection 所在 list item
- 若它是同级第一项，则不处理
- 若不是，则从当前 item 开始，向后吃掉所有比它更深的后代 item
- 把这段文本的每一行统一增加 2 个空格缩进

这样不需要引入新 AST，就能把“当前项 + 其挂载内容”整体变成子列表。

## 测试策略

本轮以回归测试先行：

- `src/renderer/code-editor.test.ts`
  - 代码块内容行直编时保持 fence 隐藏
  - 光标移动到 fence 行时回到源码态
  - `Tab` 缩进当前列表项子树

- `packages/markdown-engine/src/parse-block-map.test.ts`
  - frontmatter 风格 closing `---` 解析为 thematic break

- `src/renderer/app.autosave.test.ts`
  - 代码块样式不再包含横向滚动条，改为视觉换行

## 风险

- 代码块 active 呈现与 raw 呈现切换边界如果处理不稳，可能影响光标映射
- 列表 `Tab` 缩进如果只按单行处理，会破坏续行和嵌套块
- 分隔符规则如果过宽，可能误伤合法 setext heading

因此实现时优先让测试精确覆盖这三个边界。
