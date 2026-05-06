# 2026-05-06 Indented Code Block Intake

## 目标

让 FishMark 支持 CommonMark 的 indented code block：

```markdown
    // Some comments
    line 1 of code
```

非激活阅读态应按现有代码块视觉渲染，Markdown 源缩进仍保留为唯一事实来源。

## 范围

- `markdown-engine` 识别 top-level `codeIndented` 事件，并纳入现有 code block block map。
- `editor-core` 在 CodeMirror decorations 中给 indented code 内容行套用代码块类。
- renderer / HTML export 输出同一套代码块结构。
- 隐藏 indented code 的 4 空格或 tab 源缩进 marker，避免在阅读态把 Markdown marker 当成代码内容额外缩进。

## 非目标

- 不新增语法高亮语言推断。
- 不重命名既有 `codeFence` block type，避免扩大本轮 diff。
- 不改 fenced code block 的编辑、自动补全和 Backspace 行为。

## 验收点

- parser 对 indented code 输出稳定 block range。
- 非激活 CodeMirror 行包含 `cm-inactive-code-block` / start / end 类。
- indented source marker 使用独立隐藏 class。
- HTML export 与编辑器阅读态结构一致。
