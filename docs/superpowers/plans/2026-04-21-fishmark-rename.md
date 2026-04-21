# FishMark Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前生效的项目身份从 `Yulora/yulora` 迁移到 `FishMark/fishmark`，同时保留历史记录不追溯改写。

**Architecture:** 先锁定活跃区域与历史区域的边界，再以“测试断言 -> 配置与运行时身份 -> 包与协议前缀 -> 主题协议 -> skill 与文档收尾”的顺序推进一次性迁移。迁移不保留兼容层，所有当前生效入口在同一轮内完成切换。

**Tech Stack:** Electron、React、TypeScript、Vite、Vitest、Electron Builder、PowerShell bulk replace

---

### Task 1: 锁定边界并写红测试

**Files:**
- Modify: `src/main/package-scripts.test.ts`
- Modify: `src/main/runtime-environment.test.ts`
- Modify: `src/shared/theme-package.test.ts`

- [ ] Step 1: 把核心身份断言改成 `FishMark/fishmark`
- [ ] Step 2: 运行相关测试，确认它们因旧实现仍存在而失败
- [ ] Step 3: 记录失败点，作为后续迁移的最小通过线

### Task 2: 切换配置与运行时身份

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `electron-builder.json`
- Modify: `src/main/runtime-environment.ts`
- Modify: `src/main/runtime-windows.ts`
- Modify: `src/main/launch-open-path.ts`
- Modify: `src/shared/*`
- Modify: `src/preload/preload.ts`
- Modify: `src/main/main.ts`
- Modify: `scripts/*`
- Modify: `tools/*`

- [ ] Step 1: 替换应用名、仓库名、发布配置、userData 目录与协议前缀
- [ ] Step 2: 更新对应测试断言与脚本引用
- [ ] Step 3: 运行相关测试确认身份层通过

### Task 3: 切换包前缀与源码引用

**Files:**
- Modify: `vite.config.ts`
- Modify: `vitest.config.ts`
- Modify: `tsconfig.base.json`
- Modify: `src/**/*.ts*`
- Modify: `packages/**/*.ts*`

- [ ] Step 1: 替换 `@yulora/*` alias 为 `@fishmark/*`
- [ ] Step 2: 更新所有 import/export 与测试引用
- [ ] Step 3: 运行 `npm run typecheck`

### Task 4: 切换主题协议与资源命名

**Files:**
- Modify: `src/shared/theme-style-contract.ts`
- Modify: `src/renderer/**/*`
- Modify: `fixtures/themes/**/*`
- Modify: `src/renderer/theme-packages/**/*`
- Modify: `assets/branding/*`

- [ ] Step 1: 替换 `--yulora-*` / `data-yulora-*` 到 `fishmark`
- [ ] Step 2: 更新默认主题、fixture 主题、测试与运行时引用
- [ ] Step 3: 复查是否遗漏旧 token 前缀

### Task 5: 切换 skill 与当前文档入口

**Files:**
- Modify: `.codex/skills/**/*`
- Modify: `README.md`
- Modify: `docs/design.md`
- Modify: `docs/acceptance.md`
- Modify: `docs/test-cases.md`
- Modify: `docs/theme-packages.md`
- Modify: `docs/theme-authoring-guide.md`
- Modify: `docs/packaging.md`
- Modify: `docs/progress.md`
- Modify: `release-metadata/release-notes.json`

- [ ] Step 1: 重命名 `.codex/skills/yulora-*` 目录与 agent yaml 文案
- [ ] Step 2: 更新当前生效文档中的产品名和活跃协议说明
- [ ] Step 3: 保持历史记录目录不变

### Task 6: 全量验证与残留检查

**Files:**
- Modify: `docs/plans/2026-04-21-fishmark-rename-handoff.md`

- [ ] Step 1: 运行 `npm run lint`
- [ ] Step 2: 运行 `npm run typecheck`
- [ ] Step 3: 运行 `npm run test`
- [ ] Step 4: 运行 `npm run build`
- [ ] Step 5: 运行活跃区域残留检查并写 execution handoff
