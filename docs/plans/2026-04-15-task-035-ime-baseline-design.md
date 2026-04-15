# TASK-035 IME Baseline Design

## Scope

Task: `TASK-035`
Goal: 在块级渲染启动前，为当前纯文本 CodeMirror 编辑链路补上一层 IME 组合输入保护，避免后续接入装饰、active block 消费方或源码/渲染切换时在组合输入期间吞字或跳光标。

In scope:
- 基于当前 `src/renderer/code-editor.ts` 的 update pipeline 建立 composition guard
- 在组合输入期间延后 block-map / active-block 这类派生状态更新
- 覆盖段落、标题、列表三类高频输入场景的回归测试
- 记录当前仍未覆盖的 IME 限制和后续任务边界

Out of scope:
- `TASK-010` 到 `TASK-013` 的可见块级渲染或装饰
- `TASK-022` 级别的完整中文 IME 专项兼容
- 引用块、代码块、多光标、移动端输入法等扩展场景
- autosave / save / preload / main-process 行为变更

## Options

### 方案 A：在控制器内建立 composition guard（推荐）

做法：
- 直接利用 `EditorView.compositionStarted` / `EditorView.composing`
- 组合输入期间继续透传文档变更给 `onChange`
- 暂停 `parseBlockMap()` 和 `onActiveBlockChange()` 这类派生更新
- 在 composition 结束后按最终文档和选择态 flush 一次

优点：
- 保护点最靠近未来 block-rendering 会挂载的位置
- 不影响当前保存与 autosave 链路
- 后续 `TASK-010` 到 `TASK-013` 可以直接复用同一 guard 语义

缺点：
- 需要在控制器里维护一小段 composition 生命周期状态

### 方案 B：只在 React/App 层忽略 active-block 更新

优点：
- 改动最小

缺点：
- 保护点太高，未来如果装饰直接挂在 CodeMirror 层，仍可能中断 composition
- 无法作为真正的“基线保护”

### 方案 C：提前引入完整 IME-aware ViewPlugin 协调层

优点：
- 更贴近未来块级渲染最终形态

缺点：
- 当前阶段过重，会提前引入不必要结构
- 超出 `TASK-035` 的最小交付

## Recommended Approach

采用方案 A。

`TASK-035` 的本质不是“今天就修完所有中文输入法问题”，而是先把当前编辑器里最容易在未来被装饰和视图切换打断的更新路径隔离出来。当前 `CodeMirror` 本身已经对 composition 有底层处理，但我们自己的派生状态更新链还没有“组合输入期间暂停、结束后统一恢复”的约束。把这个约束先建立起来，后续块级渲染才能在同一条安全边界上演进。

## Design

### 1. Guard 边界

保护对象只限于派生状态：
- `parseBlockMap()`
- `createActiveBlockStateFromBlockMap()`
- `onActiveBlockChange()`

不保护的对象：
- 文档内容更新
- `onChange()` 回调
- 现有 blur / autosave / manual save 触发链路

这保证组合输入期间内存文档仍然是最新的，但任何可能诱发 DOM/装饰扰动的派生更新都要等 composition 结束后再统一执行。

### 2. 生命周期

- `compositionstart` 或 `compositionupdate` 后进入 guarded 状态
- guarded 状态下：
  - `docChanged` 时仍回调 `onChange`
  - 只记录“需要 flush”标记，不立刻重算 block map / active block
- `compositionend` 后：
  - 基于当前 `view.state` 重算 block map
  - 重新推送一次 active block
  - 清空 pending 标记

如果组合输入期间只有选择变化、没有文档变化，也仍允许在结束后统一对齐一次 active block。

### 3. 测试策略

先在 `src/renderer/code-editor.test.ts` 写失败测试：
- paragraph composition：组合期间不触发 active-block 广播风暴，结束后落到最终段落状态
- heading composition：标题前缀和正文组合输入期间不丢失最终文本
- list composition：列表项组合输入期间保持 list active block，结束后仍对齐

这些测试不模拟真实 OS 级 IME，而是用 DOM composition 事件 + CodeMirror 事务模拟“组合期间发生文档变化”的关键路径，目标是锁定我们自己的 guard 语义。

## Acceptance

- 组合输入期间不立即广播易扰动的派生状态更新
- composition 结束后派生状态能按最终文档与选择态恢复
- 段落、标题、列表三类场景有自动化回归测试
- 当前未覆盖的 IME 限制被明确记录到决策/总结文档
