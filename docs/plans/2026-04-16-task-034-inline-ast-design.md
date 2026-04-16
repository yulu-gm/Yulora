# TASK-034 Inline AST Design

## Scope

Task: `TASK-034`
Goal: 在当前 block-level 渲染链路上方补一层完整 inline AST，让 `markdown-engine` 成为行内语义的唯一来源，`editor-core` 只负责消费 AST 做非激活态渲染，从而同时满足本轮 `bold / italic / inline code / strikethrough` 渲染需求，以及紧接着的链接、图片和复杂嵌套扩展需求。

In scope:
- 建立 canonical `MarkdownDocument` 类型，保留 top-level blocks，同时为文本容器挂载 inline AST
- 产出 `text / strong / emphasis / strikethrough / codeSpan / link / image` 节点类型
- 为 heading、paragraph、list item、blockquote line 暴露稳定的内容范围和 inline root
- 让 `editor-core` 使用 AST 生成非激活态 inline decorations
- 让 `parseBlockMap()` 继续可用，避免一次性打爆现有调用点

Out of scope:
- 把整份 Markdown 文档重写成单棵 block+inline 混合 AST
- reference-style links/images、inline HTML 和完整 GFM 兼容面
- 链接点击 / 打开、图片落盘、拖放与导出行为
- 在 React/renderer 层重新解析 Markdown

## Chosen Approach

采用“保留 block map + 为文本容器补完整 inline AST”的混合模型，而不是：

1. 只在 `editor-core` 里做一次性的 range 扫描
2. 直接把当前 block parser 重构成整份文档的完整 block AST

理由：
- 语法知识应当留在 `markdown-engine`，否则后续链接、图片、复杂嵌套会把 `editor-core` 变成第二套 parser
- 现有 active block、Enter/Backspace、block decorations 已依赖 top-level blocks，没有必要为了 inline 能力推翻这一层
- 当前任务需要的是“长期可扩展的 inline 语义边界”，不是“立刻重做整个 Markdown 架构”

## Canonical Data Model

### 1. 顶层文档模型

```ts
export interface MarkdownDocument {
  blocks: MarkdownBlock[];
}

export type BlockMap = MarkdownDocument;
```

`BlockMap` 保留为兼容别名，`MarkdownDocument` 作为后续 canonical 名称。

### 2. Inline AST 节点

```ts
export interface InlineRoot {
  type: "root";
  startOffset: number;
  endOffset: number;
  children: InlineNode[];
}

export type InlineNode =
  | TextNode
  | StrongNode
  | EmphasisNode
  | StrikethroughNode
  | CodeSpanNode
  | LinkNode
  | ImageNode;
```

统一约束：
- 所有 offset 都是针对原始 Markdown 文本的 absolute offsets
- range 采用半开区间 `[startOffset, endOffset)`
- 有 marker 的节点额外记录 marker 范围，避免 decoration 层再猜 delimiter
- `codeSpan` 内不再出现二次格式化子节点

建议字段：

```ts
interface DelimitedNodeBase {
  startOffset: number;
  endOffset: number;
  openMarkerStart: number;
  openMarkerEnd: number;
  closeMarkerStart: number;
  closeMarkerEnd: number;
  children: InlineNode[];
}
```

`link` / `image` 额外暴露：
- `label: InlineRoot`
- `destinationStartOffset / destinationEndOffset`
- `titleStartOffset / titleEndOffset | null`
- 原始 destination / title 字符串

### 3. 文本容器

为后续渲染与交互稳定性，文本容器需要同时暴露“容器范围”和“内容范围”。

```ts
interface HeadingBlock {
  type: "heading";
  startOffset: number;
  endOffset: number;
  markerEnd: number;
  inline: InlineRoot;
}

interface ParagraphBlock {
  type: "paragraph";
  inline: InlineRoot;
}

interface ListItemBlock {
  markerStart: number;
  markerEnd: number;
  contentStartOffset: number;
  contentEndOffset: number;
  inline: InlineRoot;
}

interface BlockquoteLine {
  lineStart: number;
  lineEnd: number;
  markerEnd: number;
  contentStartOffset: number;
  contentEndOffset: number;
  inline: InlineRoot;
}
```

`BlockquoteBlock` 新增 `lines: BlockquoteLine[]`，因为行级 marker 与内容范围对后续 inline 渲染是必要信息。

## Parsing Strategy

### 1. Block parsing继续由 micromark 文档事件驱动

当前 `parseBlockMap()` 的 top-level block 识别逻辑继续保留，但收口到新的 `parseMarkdownDocument()`：

```ts
export function parseMarkdownDocument(source: string): MarkdownDocument;
export function parseBlockMap(source: string): BlockMap;
```

`parseBlockMap()` 只做兼容包装，内部直接委托给 `parseMarkdownDocument()`。

### 2. Inline parsing 改为 markdown-engine 内的独立阶段

对每个文本容器执行 inline parse，而不是在 renderer/editor 侧重新扫描：
- heading：从 `markerEnd` 到 `endOffset`
- paragraph：从 `startOffset` 到 `endOffset`
- list item：从 `contentStartOffset` 到 `contentEndOffset`
- blockquote line：从 `contentStartOffset` 到 `contentEndOffset`

### 3. Inline tokenizer 以 micromark `text()` 为主，本地 extension 为辅

本地验证显示 `micromark` 的 `ParseContext` 已暴露 `text()` tokenizer，适合在 content slice 上拿到行内事件。设计上采用：

- `micromark.parse().text()` 处理 `strong / emphasis / codeSpan / link / image`
- 仓库内新增本地 `strikethrough` extension 处理 `~~`
- 统一把事件流转换成 AST，不在 `editor-core` 做任何语法判断

这样可以：
- 复用现有 `micromark` 语义，而不是手写一套 attention/link/image parser
- 不为 `~~` 单独引入外部依赖
- 让 AST 对后续链接/图片任务保持可复用

### 4. 本轮兼容面

本轮 parser 目标是完整支持以下编辑器子集：
- `**strong**`
- `*emphasis*`
- `` `code span` ``
- `~~strikethrough~~`
- resource links: `[label](dest "title")`
- resource images: `![alt](src "title")`
- 常见嵌套：`***x***`、`~~**x**~~`、`**a \`c\` b**`、`[**x**](url)`

明确延后：
- reference-style links/images
- inline HTML
- 自动链接扩展以外的额外 GFM 语法

## Decoration Integration

`editor-core` 不再自己扫描 inline markers，而是把 AST flatten 成 decoration ranges。

推荐新增一个独立 helper：

```ts
createInlineDecorationsFromAst(container: InlineRoot): Decoration[]
```

规则：
- delimiter ranges 生成 marker decorations，例如 `.cm-inactive-inline-marker`
- 内容 ranges 生成语义 decorations，例如 `.cm-inactive-inline-strong`
- 嵌套节点允许叠加 class，不需要在 parser 阶段“算出最终样式”
- `codeSpan` 只装饰自己的 marker 与内容，children 只保留纯文本
- `link` / `image` 本轮先参与 AST 与 signature，但 decoration 层只递归其 label/alt children，不做专门视觉替换

这样能保证：
- `TASK-034` 只交付当前四种可见样式
- AST 已经足够支撑下一步链接/图片渲染，不需要再迁移 parser 边界

## Compatibility And Migration

为降低 blast radius，本轮保留两层兼容：

1. `parseBlockMap()` 继续存在  
2. `BlockMap` 继续存在，但成为 `MarkdownDocument` 的别名

迁移节奏：
- `markdown-engine` 先新增 canonical API
- `editor-core` 再逐步改用 `MarkdownDocument` 命名
- renderer 可以暂时继续用 `parseBlockMap()`，等本轮稳定后再清理旧名

## Signature And Cache Strategy

当前 `blockDecorationSignature` 只比较 block 级结构，接入 inline AST 后必须把 inline 内容折进去，否则：
- 仅修改 `**` / `*` / `` ` `` / `~~` 不会触发 decoration 刷新
- 嵌套格式变化会漏刷新

推荐策略：
- block signature 保留现有部分
- 文本容器额外追加 inline fingerprint
- fingerprint 基于节点类型、range、marker range 和关键 payload（如 link/image destination）

`editor-core` 侧 cache 也应从 `BlockMapCache` 升级为 `MarkdownDocumentCache`，避免名字继续误导后续维护。

## Testing Strategy

### markdown-engine

新增或扩展：
- `parse-inline-ast.test.ts`
- `parse-block-map.test.ts`

必须覆盖：
- strong / emphasis / code / strike 基本路径
- 常见嵌套
- code span 屏蔽内部格式化
- unmatched marker 回退为 `text`
- resource link/image AST 结构
- heading/list/blockquote 的 content range 与 inline root 绝对 offset

### editor-core

新增或扩展：
- `packages/editor-core/src/decorations/block-decorations.test.ts`
- 如需要，新增 `inline-decorations.test.ts`

必须覆盖：
- 非激活态 marker 隐藏与内容样式
- 嵌套样式叠加
- inline signature 变更能触发 decoration 刷新
- link/image 节点不会破坏当前四种样式渲染

### renderer

扩展：
- `src/renderer/code-editor.test.ts`

必须覆盖：
- paragraph / heading / list / blockquote 中的 inline 样式切换
- 激活 block 回源码态
- composition 期间不抖动，结束后只 flush 一次
- `replaceDocument()` 后 AST 与 decorations 一起重算

## Risks

- 本地 `strikethrough` extension 与 `attention` 的交互若处理不好，会让 `***` / `~~**` 这类输入产出错误树
- list item 与 blockquote line 的内容范围提取如果不稳定，会直接破坏 future link/image rendering
- 若 `link` / `image` 本轮只半支持、却把类型写死，会在 TASK-014 / TASK-015 再次返工
- decoration 数量会明显增长，若 signature/cache 粒度不稳，长文档输入时会开始抖动

## Rejected Alternatives

### 1. 只在 editor-core 做 inline range 扫描

优点：
- 当前 task 最快

缺点：
- 语法知识落在错误层级
- 链接/图片/复杂嵌套会很快把一次性扫描变成第二套 parser

结论：
- 不采用

### 2. 立即把整个 Markdown 模型升级为完整 block AST

优点：
- 长期最统一

缺点：
- 明显超出 `TASK-034`
- 会把 active-block、commands、块级 decorations 一起卷入大迁移

结论：
- 暂不采用
