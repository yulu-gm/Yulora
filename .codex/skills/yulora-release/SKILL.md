---
name: yulora-release
description: 用于在 Yulora 仓库中执行正式 release 发版，适合需要升级版本号、整理 GitHub Release 正文、发布 Windows 安装包或预留 macOS 发版时使用。
---

# Yulora 正式发版

## Overview

这个 skill 负责 Yulora 的正式 release 流程，而不是单独跑一个脚本。

覆盖范围：
- 更新版本号
- 整理并写入 GitHub Release 正文元数据
- 执行 Windows 正式发版
- 为 macOS 保留统一流程入口
- 做发布后核对与总结

不负责：
- 顺手实现无关功能
- 擅自变更发布渠道、签名方案或核心技术栈
- 把未实现的平台说成已发布

## Source Of Truth

- 版本号以 `package.json` 为准
- GitHub Release 标题与正文以 `release-metadata/release-notes.json` 为准
- Release 正文归纳优先读：
  - `docs/plans/*handoff.md`
  - `reports/task-summaries/`
  - `docs/progress.md`
  - `docs/decision-log.md`
- Git 提交只作补充，不是唯一事实来源

## Workflow

### 1. 预检

- 读取 `package.json`、`docs/packaging.md`、`tools/release-win.bat`、`tools/release-macos.sh`
- 确认本次目标版本号和目标平台
- 检查工作区是否适合发版，避免把无关脏改动一并带入 release

### 2. 准备版本信息

- 更新 `package.json` 的 `version`
- 同步更新 `release-metadata/release-notes.json` 的 `version`
- 若两个版本不一致，停止发布

### 3. 整理 Release 正文

- 根据本次版本相关 task、handoff、summary 和决策记录归纳用户可感知变化
- 把标题和正文写入 `release-metadata/release-notes.json`
- 不要把 GitHub Release 正文继续硬编码回脚本

参考：`references/release-note-template.md`

### 4. 执行发布

- Windows：运行 `tools\\release-win.bat`
- macOS：运行 `./tools/release-macos.sh` 前先确认脚本是否已实现；若仍是占位入口，明确停在“未实现”

### 5. 发布后核对

- Windows 至少核对：
  - `release/latest.yml`
  - `release/Yulora-Setup-<version>.exe`
  - `release/Yulora-Setup-<version>.exe.blockmap`
  - GitHub Release `v<version>` 的标题和正文是否与元数据一致
- macOS 当前只输出状态，不伪造成功结果

### 6. 总结

- 输出本次版本号
- 输出已发布平台与未发布平台
- 输出关键产物和剩余阻塞

参考：`references/release-checklist.md`

## Platform Rules

- Windows：当前正式支持
- macOS：当前只保留入口与流程位置，未接入正式打包/发版实现

## Stop Conditions

遇到以下情况必须停下：
- `package.json` 没有合法版本号
- `release-metadata/release-notes.json` 缺失
- release note 版本号与 `package.json` 不一致
- Windows 发版脚本失败
- 用户要求发 macOS，但 `tools/release-macos.sh` 仍是未实现占位

## Completion

满足以下条件才算结束：
- 版本号已更新
- Release 标题与正文已写入元数据
- Windows 已发布成功，或已给出明确失败原因
- macOS 状态已明确说明
- 已完成发布后核对
- 已输出简短发版总结
