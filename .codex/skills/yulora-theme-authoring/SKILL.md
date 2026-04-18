---
name: yulora-theme-authoring
description: 用于在 Yulora 仓库中创建、修改或审查主题时，快速约束 AI 按当前 theme package 架构工作，避免依赖过期目录结构、预留字段或不完整资源，导致主题无法扫描、无法回退或进入软件后失效。
---

# Yulora 主题编写

只在做 Yulora 主题时使用这个 skill。目标不是写出“最炫”的主题，而是先保证主题包能被扫描、切换、回退，并在动态效果失效时仍可用。

## 当前主题模型

- 只允许 `theme package`
- 内置主题目录：`src/renderer/theme-packages/<id>/`
- 社区主题目录：`<userData>/themes/<id>/`
- 每个主题包都必须有 `manifest.json`
- renderer 按顺序挂载：`tokens -> ui -> titlebar -> editor -> markdown`
- 选中主题缺失或不支持当前模式时，自动回退到内置 `default`

不要再使用旧的“主题家族 + light/dark 子目录自动拼装”思路。

## 硬边界

- `id`、`name` 必须非空
- `supports.light` / `supports.dark` 必须明确写
- 对应支持的模式，必须提供对应 `tokens`
- 生产级主题最少提供：
  - `styles/ui.css`
  - `styles/editor.css`
  - `styles/markdown.css`
- manifest 里的所有路径都必须留在主题包根目录内
- 静态 CSS 层必须独立可读，不能把可用性押在 shader 上

## 现在不要依赖

- `layout.titlebar`
- `surfaces.welcomeHero`

它们目前只是 schema 预留，不是可依赖的运行时能力。

## 最小可用结构

```text
my-theme/
  manifest.json
  tokens/
    dark.css
  styles/
    ui.css
    editor.css
    markdown.css
```

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "version": "1.0.0",
  "supports": { "light": false, "dark": true },
  "tokens": { "dark": "./tokens/dark.css" },
  "styles": {
    "ui": "./styles/ui.css",
    "editor": "./styles/editor.css",
    "markdown": "./styles/markdown.css"
  },
  "layout": { "titlebar": null },
  "scene": null,
  "surfaces": {},
  "parameters": []
}
```

## 如果要做动态主题

- 只使用 `surfaces.workbenchBackground` 和 `surfaces.titlebarBackdrop`
- `kind` 只能是 `"fragment"`
- surface 必须引用存在的 `scene.id`
- 参数需要进 shader 时才写 `uniform`
- 即使 shader 编译失败，主题也必须仍然可读
- shader请使用WebGL1 (GLSL ES 1.00)
## 交付前检查

- 主题目录能被扫描到
- `manifest.json` 合法
- 切换主题后应用不白屏、不崩溃
- 主题缺失或模式不支持时能回退到 `default`
- 主题缺少某个 style part 时不会残留旧主题样式
- 动态效果设为 `off` 时主题仍正常显示

参考实现：

- 默认主题：`src/renderer/theme-packages/default/`
- 动态主题参考：`fixtures/themes/rain-glass/`

需要完整背景时再看：
`docs/theme-authoring-guide.md`
