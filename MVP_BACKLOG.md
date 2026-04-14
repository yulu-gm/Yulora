# MVP_BACKLOG.md

## Epic 1：项目骨架

### TASK-001 初始化桌面工程
验收：
- Electron + Vite + React + TypeScript 可启动
- main / preload / renderer 分层清晰
- 有 lint / typecheck / test 脚本

### TASK-002 建立基础目录结构
验收：
- apps/desktop
- packages/editor-core
- packages/markdown-engine
- docs
- tests/e2e

---

## Epic 2：文档读写闭环

### TASK-003 打开 Markdown 文件
验收：
- 支持系统文件对话框打开 `.md`
- 内容显示到编辑器
- 错误路径有提示

### TASK-004 保存与另存为
验收：
- 当前文档可保存
- 新文档可另存为
- 保存状态可见

### TASK-005 自动保存
验收：
- 停止输入后自动保存
- 失焦时自动保存
- 保存失败不会丢内容

### TASK-006 最近文件
验收：
- 最近文件列表可显示
- 点击可重新打开
- 失效路径可清理

---

## Epic 3：编辑器接入

### TASK-007 接入 CodeMirror 6
验收：
- 基础编辑可用
- undo/redo 可用
- 快捷键正常

### TASK-008 接入 micromark，生成 block map
验收：
- 输出基础 block 类型
- 能映射 heading / paragraph / list / blockquote
- 有单元测试

### TASK-009 实现 active block 状态
验收：
- 可识别当前块
- 状态随光标移动更新
- 不破坏基础输入

---

## Epic 4：核心渲染体验

### TASK-010 heading 渲染
验收：
- 失焦时弱化/隐藏 `#`
- 聚焦时可直接编辑 Markdown 语法

### TASK-011 paragraph 渲染
验收：
- 普通段落可稳定显示
- 不影响选择和输入

### TASK-012 list / task list 渲染
验收：
- `-`、`1.`、`[ ]` 行为正确
- 回车续项
- 空项退出列表

### TASK-013 blockquote 渲染
验收：
- `>` 失焦时弱化
- 聚焦时可直接编辑

### TASK-014 link 显示与编辑
验收：
- 失焦显示文本
- 聚焦显示 Markdown 语法
- 链接可打开系统浏览器

---

## Epic 5：图片与资源

### TASK-015 图片粘贴落盘
验收：
- 粘贴 PNG/JPG 成功写入 assets
- 插入相对路径 Markdown
- 冲突命名正确

### TASK-016 图片拖放
验收：
- 拖放文件图片到编辑器可落盘
- 大图不阻塞主线程

---

## Epic 6：实用能力

### TASK-017 大纲侧栏
验收：
- heading 可解析为目录
- 点击可跳转

### TASK-018 查找替换
验收：
- 支持全文查找
- 支持替换当前/全部

### TASK-019 导出 HTML
验收：
- 当前文档可导出 HTML
- 图片路径正确

### TASK-020 导出 PDF
验收：
- 当前文档可导出 PDF
- 基础页边距配置可用

---

## Epic 7：稳定性

### TASK-021 崩溃恢复
验收：
- 异常退出后可恢复未保存内容

### TASK-022 中文输入法专项修复
验收：
- 常见中文输入流程不丢字
- 不乱跳光标

### TASK-023 round-trip 回归测试
验收：
- 保存不意外改写用户 Markdown 风格

### TASK-024 Playwright 冒烟测试
验收：
- 打开/编辑/保存/重开流程自动化通过
