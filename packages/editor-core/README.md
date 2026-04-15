# 编辑器核心包

这个目录承载跨 renderer 复用的编辑器状态、视图模型和纯逻辑。

当前已落地能力：
- `TASK-009`：active block 解析与状态模型

约束：
- 保持与 `CodeMirror` 视图实现解耦，优先放纯 TypeScript 逻辑
- Markdown 解析结果仍以 `packages/markdown-engine/` 为唯一来源
- 不在这里放文件系统访问或 Electron bridge 代码
