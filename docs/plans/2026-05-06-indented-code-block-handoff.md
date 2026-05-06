# 2026-05-06 Indented Code Block Handoff

## 改了什么

- `packages/markdown-engine` 新增 indented code block 识别，把 micromark `codeIndented` 事件纳入现有 code block block map，并标记 `kind: "indented"`。
- `packages/editor-core` 的 code block line helper 支持 fenced / indented 两种行模型；indented code 内容行使用现有代码块样式，并隐藏 4 空格或 tab 源缩进 marker。
- `src/renderer/export-html.ts` 导出 indented code block 时复用同一套 `cm-inactive-code-block` 结构。
- `src/renderer/styles/markdown-render.css` 增加 `cm-inactive-code-block-indent-marker` 隐藏规则。
- `docs/standards/markdown-text-rendering-standard.json` 的人工 fixture 描述补充 indented code block。

## 落点文件

- `packages/markdown-engine/src/code-block.ts`
- `packages/markdown-engine/src/block-map.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/editor-core/src/decorations/block-lines.ts`
- `packages/editor-core/src/decorations/block-decorations.ts`
- `packages/editor-core/src/commands/code-fence-commands.ts`
- `packages/editor-core/src/interactions/adapters/code-fence-adapter.ts`
- `src/renderer/export-html.ts`
- `src/renderer/styles/markdown-render.css`

## 推荐验证命令

```powershell
npm run test -- packages/markdown-engine/src/parse-block-map.test.ts packages/editor-core/src/decorations/block-decorations.test.ts src/renderer/code-editor.test.ts src/renderer/export-html.test.ts src/renderer/app.autosave.test.ts
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 人工验收草稿

1. 新建文档并输入一个普通段落、空行、4 空格缩进的多行代码、空行、后续段落。
2. 光标移到后续段落，确认缩进代码按代码块背景、等宽字体和 start/end 圆角渲染。
3. 确认阅读态不额外显示 4 空格造成的整体二次缩进。
4. 光标移回代码内容，确认源码仍可编辑且保存后原始 4 空格缩进保留。

## 已知风险

- 本轮沿用历史 `codeFence` block type，只新增 `kind` 区分 fenced / indented；这是为了避免把旧 fenced code 相关命令和测试扩大成命名重构。
- indented code 没有 info string，因此不会触发现有语言高亮。
