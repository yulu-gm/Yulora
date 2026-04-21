# FishMark Rename Design

## Goal

把当前生效的项目身份从 `Yulora/yulora` 统一迁移到 `FishMark/fishmark`，覆盖品牌展示、运行时身份、包与协议前缀、主题协议、打包发布配置与仓库内活跃 skill，同时保留历史计划、历史总结和历史决策记录不做追溯改写。

## Scope

### In scope

- 用户可见品牌与说明文档
- Electron 应用身份、安装包身份、GitHub 发布配置
- 运行时参数、IPC channel、协议前缀、日志前缀、用户数据目录
- TypeScript import alias 与源码内部命名
- 主题与样式协议中的 `--yulora-*` / `data-yulora-*`
- 项目内 `.codex/skills/yulora-*` 目录与当前说明文本
- 对应测试与打包脚本

### Out of scope

- 历史文档追溯改写
- 旧名称兼容层
- 与重命名无关的产品行为修改

## Design

### 1. 活跃区域与历史区域分离

先把仓库划分成“活跃区域”和“历史区域”。活跃区域允许全量迁移，包括源码、配置、当前产品文档、主题资源与技能目录。历史区域保持原状，包括 `docs/plans/`、`docs/superpowers/`、`reports/task-summaries/`、`docs/decision-log.md`、`docs/test-report.md` 等记录性材料。

### 2. 单次迁移，不保留双前缀

此次迁移不引入 `yulora` 到 `fishmark` 的兼容映射。原因是当前项目仍处于快速迭代期，保留双前缀只会放大后续维护成本，并且用户已明确希望“全部替换”。实现上采用一次性迁移：先更新测试断言，再批量更新配置、源码、主题协议和技能目录。

### 3. 身份层同步迁移

以下身份必须同时变化，避免仓库名、应用名、打包名和运行时目录彼此不一致：

- `package.json name` 和仓库 URL
- `electron-builder` 中的 `appId`、`productName`、`publish.repo`
- runtime/dev app name 与 `userData` 目录名
- 打包脚本、release metadata、测试中的路径与标题断言

### 4. 协议层同步迁移

以下协议按统一规则迁移：

- `@yulora/*` -> `@fishmark/*`
- `yulora:*` -> `fishmark:*`
- `--yulora-*` -> `--fishmark-*`
- `data-yulora-*` -> `data-fishmark-*`
- `--yulora-runtime-mode=` / `--yulora-startup-open-path=` -> `--fishmark-runtime-mode=` / `--fishmark-startup-open-path=`

### 5. 主题与样式协议一并迁移

主题 token、runtime env、manifest 引用、fixture 主题与默认主题需要一起改名，否则 renderer、主题包与测试之间会产生整片不匹配。主题文档也同步更新到 `FishMark/fishmark` 术语，但历史设计记录不追改。

## Testing

- 先更新核心身份相关测试断言并观察失败
- 完成重命名后运行 `npm run lint`
- 运行 `npm run typecheck`
- 运行 `npm run test`
- 运行 `npm run build`
- 使用 `rg` 对活跃区域做残留检查，确认未遗漏旧前缀

## Risks

- 远端仓库名如果尚未同步，GitHub release 发布脚本会失效
- userData 目录变化会影响 dev/runtime 相关测试与本地调试缓存
- 主题 token 批量替换覆盖面大，容易出现单个 data attribute 或 CSS var 漏改
- 技能目录改名后，仓库内文档引用若仍指向旧 skill 名称，可能造成本地协作说明漂移
