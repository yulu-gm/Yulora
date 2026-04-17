# TASK-015 图片粘贴与常驻渲染设计

Task: TASK-015  
Date: 2026-04-17

## Goal

支持从剪贴板粘贴图片到当前 Markdown 文档时，把图片写入文档同级 `assets/` 目录并插入相对路径 Markdown；编辑器中的图片在激活态与非激活态都保持可见，激活态额外显示对应 Markdown 源码。

## Context

当前仓库已经有：

- `packages/markdown-engine` 的 `image` inline AST
- `packages/editor-core` 的非激活态 decorations 管线
- `src/main` / `src/preload` / `src/renderer` 的文件读写桥接与错误提示链路

但图片相关能力仍停留在 AST 层，没有导入链路，也没有可见渲染。

## Approach

采用“两段式”实现：

1. 图片导入链路继续遵守 Electron 三层分离  
   `main` 负责读取系统剪贴板、校验格式/大小、写入本地 `assets`、生成相对路径 Markdown；`preload` 只暴露受限 IPC；`renderer` 只负责识别粘贴动作、请求导入、把返回的 Markdown 插入编辑器。

2. 图片显示继续走现有 CodeMirror decoration 管线  
   `markdown-engine` 不新增第二套 parser；`editor-core` 基于已有 `image` inline AST 生成图片 widget：
   - 非激活态：整段 image Markdown 被图片预览替换
   - 激活态：Markdown 源码保留，图片 widget 追加在源码下方

## Key Decisions

### 1. 图片保存目录

使用当前 Markdown 文件同级的 `assets/` 目录。

理由：

- 符合 backlog 与设计文档里“资源文件尽量保持相对路径”
- HTML / PDF 导出后续更容易复用
- 不依赖全局缓存目录，不会破坏本地优先

### 2. 命名策略

默认文件名采用：

`<document-base>-image-<timestamp>.<ext>`

若冲突则在尾部追加 `-2`、`-3`。

理由：

- 名称可读，便于人工在 `assets/` 中定位
- 不依赖随机 UUID，测试更容易稳定断言

### 3. 格式与大小限制

白名单：`PNG / JPG / WebP / GIF`  
大小上限：10 MiB

超限或不支持格式时，直接返回错误，不写文件。

### 4. 新建未保存文档的策略

未保存文档不允许导入图片。

理由：

- 资源目录需要稳定的文档路径作为锚点
- 避免把资源误写到临时目录或应用目录

### 5. 激活态的图片展示

激活态不回退成纯源码。源码仍可编辑，但图片继续显示在源码下方。

这会让“当前 block 可直接编辑 Markdown”与“图片始终可见”同时成立；对于本轮由粘贴导入产生的独立图片段落，交互最符合用户要求。

## Landing Area

- `src/main/clipboard-image-import.ts`
- `src/main/main.ts`
- `src/preload/preload.ts`
- `src/preload/preload.contract.test.ts`
- `src/shared/clipboard-image-import.ts`
- `src/renderer/editor/App.tsx`
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/types.d.ts`
- `src/renderer/styles/markdown-render.css`
- `packages/editor-core/src/decorations/*`
- `packages/editor-core/src/extensions/markdown.ts`

## Risks

- 粘贴事件拦截不能误伤普通文本粘贴
- active block 仍需保持光标、IME、undo/redo 稳定
- 图片 widget 需要避免引入第二套解析逻辑
- Windows 路径与 `file://` URL 转换要稳定

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- 人工执行 `TC-030`，并补一条“激活态源码在上、图片仍可见”的检查
