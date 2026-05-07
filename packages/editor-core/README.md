# 编辑器核心包

这个目录承载 FishMark 编辑器运行时中可复用的编辑能力。当前它同时包含 Markdown 语义编辑逻辑、CodeMirror 6 adapter、decorations、commands 和 interaction runtime；它不是一个完全脱离 CodeMirror 的纯语义包。

当前已落地能力：
- `TASK-009`：active block 解析与状态模型

约束：
- Markdown 语义 helper 优先保持纯 TypeScript，便于后续按需拆成 `semantic-core`
- CodeMirror extension / command / decoration / interaction 代码可以放在这里，但要集中在显式 runtime / adapter 边界内
- Markdown 解析结果仍以 `packages/markdown-engine/` 为唯一来源
- 不在这里放文件系统访问或 Electron bridge 代码

后续如果这个包继续膨胀，可按 `semantic-core` / `codemirror-adapter` 两层拆分；当前先保留单包，避免为未稳定的编辑器边界提前拆目录。
