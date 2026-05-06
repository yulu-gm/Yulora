# reference-style image 支持 intake

日期：2026-05-06

## 背景

当前 FishMark 已支持 inline Markdown 图片 `![alt](url)` 和 HTML `<img>` 的图片预览，但 `![Alt text][id]` 这类 reference-style image 无法解析到后续 definition 中的 URL，因此阅读态不会显示图片。

示例：

```markdown
![Alt text][id]

[id]: https://octodex.github.com/images/dojocat.jpg  "The Dojocat"
```

## 范围

- 支持 paragraph / heading / list / blockquote 内的 reference-style image。
- 复用现有 `markdown-engine` inline AST 与 `editor-core` 图片 widget，不新增第二套 Markdown 渲染器。
- HTML export 复用同一 parser 语义，并且 definition 行不作为正文输出。
- 保持 definition 原文可编辑；非激活态可折叠显示。

## 非范围

- 不新增图片下载、缓存或远程资源校验。
- 不扩展复杂 nested label 的完整 CommonMark 覆盖。
- 不改剪贴板图片导入链路。

## 验收点

- `parseMarkdownDocument()` 能把 reference-style image 的 `href/title` 回填到 `InlineImage`。
- CodeMirror 非激活态能用图片 widget 替换 `![Alt text][id]`。
- HTML export 输出 `<img>`，并且不泄漏 `[id]: ...` definition 行。
