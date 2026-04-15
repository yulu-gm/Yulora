# TASK-003 Open Markdown File Design

## Goal

为 Yulora 建立一条从 `main` 到 `preload` 再到 `renderer` 的安全打开链路，让用户可以通过系统文件对话框选择 `.md` 文件，并将 UTF-8 文本内容加载到当前应用状态中显示。

## Scope

本设计覆盖：
- 系统文件对话框打开 `.md` 文件
- 主进程中的 UTF-8 文本读取与错误分类
- `preload` 暴露受限的打开文件 bridge
- `renderer` 中的当前文档状态
- 基于 `<textarea>` 的临时文档显示与内存编辑
- 至少一条失败路径测试

本设计不覆盖：
- 保存、另存为、自动保存
- 应用菜单和快捷键
- CodeMirror 6 接入
- 最近文件、崩溃恢复、文件监视

## Context

当前仓库只完成了 Electron 壳、基础 preload bridge 和 React renderer 接线。`src/main/main.ts` 负责创建主窗口，`src/preload/preload.ts` 当前只暴露 `platform`，`src/renderer/App.tsx` 仍是固定文案界面。

`TASK-003` 的目标不是引入完整编辑器，而是建立一条稳定、安全、可测试的“打开 Markdown 文件”最小闭环，为后续 `TASK-004` 保存链路和 `TASK-007` CodeMirror 接入提供基础。

## Requirements

### Functional Requirements

1. 用户可以通过页面内的 `Open Markdown` 按钮触发系统文件对话框。
2. 系统文件对话框只允许选择单个 Markdown 文件。
3. 主进程必须以 UTF-8 读取目标文件内容。
4. 打开成功后，renderer 必须显示文件名、文件路径和文本内容。
5. 页面主区域必须使用一个临时 `<textarea>` 承载当前文档文本，允许在内存中编辑。
6. 用户取消选择文件时，不应清空当前文档，也不应显示错误提示。
7. 文件读取失败时，页面上必须显示明确错误提示。

### Quality Requirements

1. 读取文件的 Node / Electron 能力只能保留在 `main`，renderer 不得直接访问文件系统。
2. preload 暴露的 API 必须是显式、受限、可序列化的接口。
3. 错误必须映射为稳定的应用层结果对象，而不是把原始异常直接抛给 renderer。
4. 当前文档状态必须保持最小模型，只承载本任务所需信息。

## Architecture

### Flow

1. renderer 点击 `Open Markdown`
2. renderer 调用 `window.yulora.openMarkdownFile()`
3. preload 通过 IPC 转发到 main
4. main 打开系统对话框并读取文件
5. main 将结果映射成结构化返回值
6. preload 将结果返回 renderer
7. renderer 更新页面状态并显示结果

### Main / Preload / Renderer Responsibilities

#### `src/main/`

- 注册打开文件 IPC handler
- 调用 `dialog.showOpenDialog`
- 校验目标路径
- 以 UTF-8 读取文件
- 将异常映射为稳定错误码和用户可读消息

#### `src/preload/`

- 暴露 `openMarkdownFile()` 受限 bridge
- 不暴露通用 IPC 或 Node API

#### `src/renderer/`

- 维护当前文档状态
- 维护打开中和错误提示状态
- 展示文件元信息和 `<textarea>`
- 在取消或失败场景下保持合理 UI 行为

## Data Model

### Open Result

```ts
type OpenMarkdownFileResult =
  | {
      status: "success";
      document: {
        path: string;
        name: string;
        content: string;
        encoding: "utf-8";
      };
    }
  | {
      status: "cancelled";
    }
  | {
      status: "error";
      error: {
        code: "dialog-failed" | "file-not-found" | "not-a-file" | "read-failed" | "non-utf8";
        message: string;
      };
    };
```

### Renderer State

```ts
type CurrentDocument = {
  path: string;
  name: string;
  content: string;
  encoding: "utf-8";
} | null;

type OpenState = "idle" | "opening";
```

## UI Behavior

### Initial State

- 页面显示当前任务说明
- 页面提供 `Open Markdown` 按钮
- 没有当前文档时不显示编辑区

### Success State

- 清空错误提示
- 页面显示文件名与完整路径
- 页面展示 `<textarea>`
- `<textarea>` 的值来自当前文档内容
- 用户可以修改 `<textarea>` 中的内存文本

### Cancelled State

- 保持已有当前文档不变
- 不显示错误提示
- 打开按钮恢复可用

### Error State

- 保持已有当前文档不变
- 页面显示明确错误文案
- 打开按钮恢复可用

## Error Mapping

主进程将底层失败映射到以下稳定错误码：

- `dialog-failed`
- `file-not-found`
- `not-a-file`
- `read-failed`
- `non-utf8`

推荐的用户文案方向：

- `dialog-failed`: `The file picker could not be opened.`
- `file-not-found`: `Selected file could not be found.`
- `not-a-file`: `Selected path is not a file.`
- `read-failed`: `The Markdown file could not be read.`
- `non-utf8`: `Only UTF-8 Markdown files are supported right now.`

## Testing Strategy

### Main Tests

- 成功读取 UTF-8 Markdown 文件并返回 `success`
- 文件不存在时返回 `file-not-found`
- 选中目录时返回 `not-a-file`
- 读取失败时返回 `read-failed`

### Renderer Tests

- 打开成功后显示文件名、路径和内容
- 取消打开时保留现有状态且不显示错误
- 打开失败时显示错误提示
- 修改 `<textarea>` 后只更新 renderer 内存状态

## Risks

1. Node 对无效 UTF-8 的处理可能不会天然抛错，因此需要显式检测 UTF-8 解码失败。
2. 过早把 `<textarea>` 抽象成“编辑器层”会扩大任务范围，因此本次只把它视作临时显示容器。
3. 如果 renderer 自己推断错误文案，后续保存链路会产生重复逻辑，因此错误映射应尽量集中。

## Recommendation

采用“main 负责文件能力与错误映射，preload 暴露单一 bridge，renderer 负责当前文档状态和最小 UI”的方案。

这个方案最符合当前仓库的 Electron 三层分离约束，能够用最小 diff 满足 `TASK-003` 的验收，并为后续保存与编辑器接入留出清晰边界。
