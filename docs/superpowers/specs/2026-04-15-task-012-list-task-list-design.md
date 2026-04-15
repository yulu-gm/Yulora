# TASK-012 列表 / 任务列表设计

## Goal

在不放弃 Markdown 源码直编体验的前提下，为无序列表、有序列表和任务列表提供稳定的非激活态显示，并让 `Enter` 在列表项内表现为可预测的续项 / 空项退出语义。

## Scope

本设计覆盖：
- `packages/markdown-engine` 中的列表项级 metadata 扩展
- `src/renderer/code-editor.ts` 中的列表非激活态装饰
- 列表、任务列表和嵌套列表的 `Enter` 语义
- editor test driver / test harness 所需的最小测试命令扩展
- 至少一个真实 scenario，用于覆盖列表编辑路径

本设计不覆盖：
- 点击任务列表 checkbox 直接切换勾选状态
- 富文本 list widget、隐藏源码字符、React 侧重新解析 Markdown
- 超出 `TASK-012` 的引用块、链接、图片、代码块交互
- 新的数据存储模型或 Markdown 重排

## Context

当前仓库已经具备三块相关基础：

1. `packages/markdown-engine/src/parse-block-map.ts` 已能识别顶层 `list` block，但只输出 `ordered`，没有 item 级信息。
2. `src/renderer/code-editor.ts` 已建立 inactive heading / paragraph 的统一装饰管线，并且已经对 IME composition flush 做了 guard。
3. `packages/test-harness` 与 `src/renderer/editor-test-driver.ts` 已能跑 editor scenario，但现有命令只覆盖“打开文件 / 改文本 / 断言内容”，还不能表达“设置光标并按 Enter”。

因此，`TASK-012` 的难点不是“把列表画出来”，而是让 block metadata、CodeMirror 装饰、Enter 命令和 scenario 测试入口保持同一条边界。

## Approaches

### 方案 A：只在 renderer 按当前行正则推断列表

做法：
- 不改 block map
- `code-editor.ts` 直接扫描当前文档行文本，用正则判断 marker、checkbox 和缩进
- `Enter` 语义也基于行文本判断

优点：
- 上手快
- 变更集中在 renderer

缺点：
- 嵌套列表、空项退出和 scenario 回归会重复解析逻辑
- block map 和编辑器行为会分叉，后续 `TASK-017` 一类能力更难复用

### 方案 B：扩展 block map 到列表项级 metadata，并沿用现有装饰管线

做法：
- 在 `markdown-engine` 里为 `ListBlock` 补 `items`
- 每个 item 至少包含：行范围、缩进列、marker 范围、marker 文本、是否 task item、勾选状态
- renderer 继续使用同一个 decoration pipeline，根据 active block 是否为该 list 决定是否渲染
- `Enter` 语义仍在 `code-editor.ts`，但使用和 block map 一致的行级解析规则

优点：
- 最贴合当前架构
- 列表渲染、Enter 语义、scenario 断言可以共享同一套概念边界
- diff 可控，不需要引入新的视图层

缺点：
- 需要补一轮 parser 测试
- 为了 scenario 自动化，需要追加 editor test command

### 方案 C：先做完整 list tree/view model，再让 renderer 消费

做法：
- 在 `editor-core` 新建完整列表树模型
- renderer 和 test driver 都消费这个模型

优点：
- 长期抽象更完整

缺点：
- 对 `TASK-012` 过重
- 会把本轮 diff 扩大到超出“一个核心模块 + 一个配套测试面”的建议体积

## Recommendation

推荐方案 B。

原因：
- 它复用现有 `blockMap + activeBlockState + CodeMirror decoration + composition guard` 主路径，不引入第二套渲染机制。
- 它能支撑你要求的 scenario 测试，因为 scenario 要表达的动作最终还是“光标在某一行 / 某一列按 Enter 之后内容如何变化”，而不是一个纯视觉快照。
- 它把 parser 增量控制在“列表项级 metadata”这一最小必需面，没有过早引入重型 list tree。

## Requirements

### Functional Requirements

1. 非激活态无序列表应可区分 bullet marker 与正文。
2. 非激活态有序列表应可区分序号 marker 与正文。
3. 非激活态任务列表应可区分 bullet、task marker 和正文；`[ ]` 与 `[x]` 的显示必须有差异。
4. 激活列表块时，用户仍直接编辑 Markdown 源码，不隐藏 marker。
5. 在非空无序列表项按 `Enter`，应生成同级新项并保留原缩进与 bullet 族。
6. 在非空有序列表项按 `Enter`，应生成同级新项并递增序号。
7. 在非空任务列表项按 `Enter`，应生成新的未勾选 task item。
8. 在空列表项按 `Enter`，应退出当前列表层级；嵌套项至少要能回退一层。
9. 任务列表与嵌套列表至少各有一个自动化回归场景。

### Quality Requirements

1. IME composition guard 不能因新增列表装饰或 `Enter` 命令而失效。
2. 不引入 React 侧 Markdown 解析；列表渲染仍由 CodeMirror decoration 完成。
3. 不新增独立富文本状态；磁盘事实来源仍是 Markdown 文本。
4. 列表行为变化必须有 parser、renderer 和 harness 三层验证证据。

## Architecture

### 1. List metadata boundary

`ListBlock` 扩展为：

```ts
export interface ListItemBlock {
  id: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  indent: number;
  marker: "-" | "*" | "+" | `${number}.` | `${number})`;
  markerStart: number;
  markerEnd: number;
  task:
    | null
    | {
        checked: boolean;
        markerStart: number;
        markerEnd: number;
      };
}

export interface ListBlock extends BaseBlock {
  type: "list";
  ordered: boolean;
  items: readonly ListItemBlock[];
}
```

这里不试图建立完整 tree，只保留 `indent` 作为层级线索。对 `TASK-012` 而言，这已经足够支持：
- inactive list line styling
- task marker styling
- 空项退出时判断是否需要 dedent 一层

### 2. Inactive list decoration pipeline

继续沿用 `src/renderer/code-editor.ts` 当前的统一装饰 state field。

新增规则：
- `heading` / `paragraph` 逻辑保持不变
- `list` 在非激活态时，为每个 item 首行添加 `Decoration.line`
- 为列表 marker 添加 `Decoration.mark`
- 为 task marker 添加 `Decoration.mark`

建议 class 结构：

```ts
cm-inactive-list
cm-inactive-list-ordered
cm-inactive-list-unordered
cm-inactive-list-item
cm-inactive-list-marker
cm-inactive-task-marker
cm-inactive-task-marker-checked
cm-inactive-task-marker-unchecked
cm-inactive-list-depth-0
cm-inactive-list-depth-1
```

本轮不隐藏源码字符；通过颜色、间距和 marker emphasis 形成 Typora 风格的“阅读态”。

### 3. Enter command boundary

`Enter` 语义放在 `code-editor.ts` 的 keymap 层，而不是放进 React 或 test driver。

最小规则：
- 非列表块：继续使用默认 `Enter`
- 列表块但当前行不是列表项：继续使用默认 `Enter`
- 非空项：
  - unordered: 插入 `\n${indent}${bullet} `
  - ordered: 插入 `\n${indent}${nextNumber}. `
  - task: 插入 `\n${indent}${bullet} [ ] `
- 空项：
  - top-level: 删除当前 marker，留下空行
  - nested: 删除当前 marker，并回退一层缩进

“空项”定义为：
- marker 之后只有空白
- task item 中 `[ ]` / `[x]` 后只有空白

### 4. Scenario automation boundary

为了让 harness 能验证 `Enter` 语义，需要扩展 editor test command：

```ts
| { type: "set-editor-selection"; anchor: number; head?: number }
| { type: "press-editor-enter" }
```

`editor-test-driver.ts` 负责把它们翻译成真实编辑器动作：
- `set-editor-selection` -> 调整 CodeMirror selection
- `press-editor-enter` -> 调用 controller 的 enter command 或直接 dispatch key-equivalent command

这样 scenario 可以真实表达：
1. 打开 fixture
2. 把光标移到某个列表项末尾
3. 按 `Enter`
4. 断言编辑器内容

## Scenario Strategy

新增一个首轮 scenario：

`list-enter-behavior-basic`
- 打开一个包含 unordered + ordered + task list 的 fixture
- 在非空 task item 末尾按 `Enter`，断言生成新 task item
- 在空 task item 上按 `Enter`，断言退出当前列表层级

如果实现过程中嵌套列表逻辑明显独立，再补第二个 scenario：

`nested-list-exit`
- 打开嵌套列表 fixture
- 在空嵌套项按 `Enter`
- 断言内容回退到上一层缩进

## Testing Strategy

### Parser tests

`packages/markdown-engine/src/parse-block-map.test.ts`
- 列表项 metadata 完整输出
- 区分 ordered / unordered / task checked / task unchecked
- 嵌套列表项的 `indent` 和 marker 范围正确

### Renderer tests

`src/renderer/code-editor.test.ts`
- inactive unordered / ordered / task list 装饰
- active list 恢复源码态
- `Enter` 续项
- 空项退出
- composition 期间列表 inactive 装饰与 active block flush 不抖动

### Harness / scenario tests

`packages/test-harness/src/handlers/electron.test.ts`
- 新 scenario 的步骤映射正确
- 新 editor commands 被正确下发

`src/renderer/editor-test-driver` 相关测试
- 可以设置 selection
- 可以触发 `Enter`
- 内容断言符合预期

## Risks

1. 空项退出语义最容易影响 undo/redo 与光标位置，这是本轮最高风险点。
2. 如果 ordered list 的续项规则只看当前 marker 文本，嵌套层级和 `1)` / `1.` 的兼容性容易出错。
3. 如果 scenario 命令面设计过宽，会把 `TASK-012` 变成“半个自动化平台扩展”；因此只加 selection 和 enter 两个最小命令。

## Decision

本轮采用“列表项级 metadata + 统一 decoration 管线 + keymap 层 Enter 语义 + 最小 scenario 命令扩展”的设计。

这样做的结果是：
- 列表显示仍是视图层能力，而不是新数据真相
- Markdown round-trip 风险可控
- scenario 测试能覆盖真实编辑路径，而不是只做静态文档断言
