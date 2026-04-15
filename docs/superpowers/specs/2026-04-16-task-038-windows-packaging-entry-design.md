# TASK-038 Windows Packaging Entry Design

## Goal

为当前 Yulora Electron 项目增加一条本地 Windows 打包入口，让开发者可以在 Windows 机器上通过单条命令产出可安装的 `.exe` 安装包，而不改变现有开发与构建链路。

## Scope

本设计覆盖：
- 选择并接入最小可用的 Windows 打包方案
- 新增本地一键打包命令入口
- 复用现有 `build` 产物生成 Windows 安装器 `.exe`
- 约束安装包只包含运行时所需文件
- 补充最小应用元信息与打包说明文档

本设计不覆盖：
- macOS `.dmg` / `.zip` 产物
- 代码签名、证书申请、公证
- 自动更新服务接入
- 正式品牌图标与安装器视觉定制
- CI 发布流水线

## Context

当前仓库已经具备可运行的 Electron + React + TypeScript + Vite 构建闭环：

- `npm run build` 会生成 `dist/`、`dist-electron/`、`dist-cli/`
- `package.json` 的 `main` 已指向编译后的 `dist-electron/main/main.js`
- renderer 生产构建使用相对资源路径，适合被打进 Electron 安装包
- 仓库尚未接入任何正式打包工具，当前只能构建，不能生成完整 Windows 安装器

`MVP_BACKLOG.md` 中的 `TASK-038` 已明确要求：
- 接入打包脚本
- 产出 Windows `.exe`
- 记录签名 / 自动更新的后续接入点

这次需求只实现 `TASK-038` 的最小 Windows 本地切片，不把范围扩展到跨平台发布体系。

## Approaches

### 方案 A：接入 `electron-builder`，使用 NSIS 生成 Windows 安装器

做法：
- 新增 `electron-builder` 作为开发依赖
- 在根目录补充最小打包配置
- 新增 `package:win` 脚本，先跑现有 `build`，再调用 builder 生成安装器

优点：
- 最贴合“直接产出 `.exe`”的目标
- 与当前单仓库、手写构建脚本兼容
- 后续扩展到 macOS 产物、签名和自动更新时仍可沿用

缺点：
- 需要新增一个较重的打包依赖
- 需要明确安装包文件白名单，避免把源码和测试目录打进去

### 方案 B：改用 Electron Forge 统一开发和打包

做法：
- 引入 Forge 配置体系
- 让开发、打包、maker 都走 Forge

优点：
- 工具链一体化
- 社区常见方案，maker 生态完整

缺点：
- 会和当前已经稳定的 `build` / `dev` 脚本发生职责重叠
- 为了一个本地 `.exe` 入口引入了更大的结构变化

### 方案 C：手工拼装 `electron-packager` 与独立安装器工具

做法：
- 先产出 unpacked 应用目录
- 再额外接安装器生成步骤

优点：
- 理论上每一步更可控

缺点：
- 配置分散
- 维护成本高
- 不符合当前项目“diff 聚焦且可回退”的任务规则

## Recommendation

推荐方案 A：`electron-builder` + NSIS。

原因：
- 它最直接满足“本地一键生成 Windows `.exe`”的目标
- 它允许我们保留现有 `npm run build` 作为事实上的应用构建入口，只在其上叠加打包步骤
- 它的配置可以先收敛到 Windows 最小切片，后续再扩展，不需要现在就进入正式发布体系

## Requirements

### Functional Requirements

1. 仓库根目录必须提供一条明确的 Windows 打包命令入口，例如 `npm run package:win`。
2. 打包命令必须先构建 renderer、main/preload 和 CLI 运行时，再生成安装器。
3. 打包产物必须包含可在 Windows 上安装的 `.exe` 安装器。
4. 安装器必须基于当前 Electron 主入口启动应用，而不是依赖开发服务器。
5. 打包输出目录必须固定，便于开发者定位产物。
6. 打包说明文档必须写清楚执行命令、输出位置和当前限制。

### Quality Requirements

1. 不得替换当前 Electron / React / TypeScript / Vite 核心技术栈。
2. 不得为了打包改写现有 `main / preload / renderer` 分层边界。
3. 安装包内容必须最小化，不打入 `src/`、`tests/`、`docs/` 等运行时无关目录。
4. 现有 `npm run build` 行为必须保持稳定，新增打包入口不能破坏开发与测试链路。
5. 配置中要预留图标、签名和自动更新的后续接入位置，但本轮不实现这些能力。

## Architecture

### 1. Build Boundary

现有构建链路保持不变：

- `build:renderer` 生成 `dist/`
- `build:electron` 生成 `dist-electron/`
- `build:cli` 生成 `dist-cli/`

新的 Windows 打包入口只做两件事：

1. 调用现有 `npm run build`
2. 使用打包工具读取构建产物并生成安装器

这保证“构建应用”和“打包分发”是两个分开的步骤，便于回退与排查。

### 2. Packaging Configuration Boundary

打包配置放在仓库根目录，并以当前仓库结构为准：

- 应用入口：`package.json#main`
- 运行时文件：
  - `dist/**`
  - `dist-electron/**`
  - `dist-cli/**`
  - `package.json`
- 排除项：
  - `src/**`
  - `tests/**`
  - `docs/**`
  - `reports/**`
  - `.artifacts/**`
  - 仅开发所需配置文件

配置必须显式写出 `files` 边界，避免 builder 默认打入无关目录。

### 3. Windows Output Shape

本轮 Windows 产物固定为：

- 目标平台：Windows
- 目标架构：优先 `x64`
- 安装器类型：NSIS `.exe`
- 输出目录：`release/`

不额外生成便携版，不同时覆盖多个 Windows 安装器方案。

### 4. Application Metadata

本轮补充最小元信息：

- `productName`
- `appId`
- 安装器产物命名规则

图标策略：
- 如果仓库内已有正式 Windows 图标资源，则接入它
- 如果没有，则允许沿用默认图标先打通链路
- 文档中必须明确这是待后续补齐的发布资产

### 5. Error Handling

打包失败时不引入新的应用层错误映射；直接让 `npm run package:win` 以非零退出码失败即可。

重点是保证失败点可区分：
- 构建失败：来自现有 `build` 脚本
- 打包配置失败：来自 builder 配置校验
- 安装器生成失败：来自 builder 打包阶段

## Testing Strategy

### Config / Script Regression

在现有配置回归测试中新增约束，至少覆盖：
- 存在 Windows 打包脚本入口
- 打包脚本先执行构建再执行打包
- 打包配置存在并声明 Windows NSIS 产物
- 打包配置限制了运行时文件范围

推荐测试落点：
- `src/main/package-scripts.test.ts`

### Verification Commands

本轮自动验证最小集合：
- `npm run test -- src/main/package-scripts.test.ts`
- `npm run build`
- `npm run package:win`

### Manual Smoke Check

在 Windows 上执行一次最小人工冒烟：
1. 运行 `npm run package:win`
2. 在 `release/` 中确认生成 `.exe`
3. 启动安装器并完成安装
4. 确认应用可启动并进入当前桌面壳

## Documentation

需要新增或更新打包说明文档，至少包含：
- 如何在本地 Windows 机器上执行打包
- 打包前置条件
- 产物输出目录
- 当前未覆盖签名、正式图标和自动更新
- 后续扩展位：签名、公证、自动更新

## Risks

1. `electron-builder` 默认打包范围如果不加限制，容易把源码、测试和文档一并打入安装包，这是本轮的主要配置风险。
2. 如果图标资源尚未准备好，强行把“正式图标”纳入验收会扩大任务范围，因此本轮只保证入口打通。
3. 如果把 Windows 打包入口直接揉进现有 `build`，会模糊“构建”和“分发”边界，后续排查失败原因会更困难。

## Decision

本轮采用“保留现有构建链路 + 新增独立 `package:win` 入口 + 使用 `electron-builder` 生成 NSIS 安装器”的设计。

这样做的结果是：
- 用户可以在当前 Windows 机器上直接生成完整 `.exe`
- 现有开发、测试与构建入口保持稳定
- 打包能力以最小 diff 落地，并为后续图标、签名和自动更新保留清晰扩展点
