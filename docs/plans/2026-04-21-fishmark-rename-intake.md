Task: FishMark rename
Goal: 将当前生效的项目品牌、运行时身份、代码前缀、主题协议、打包与发布配置从 `Yulora/yulora` 迁移到 `FishMark/fishmark`，同时保留历史文档内容不追溯改写。
In scope:
- 当前产品文案、窗口标题、README、活跃说明文档
- `package.json`、`electron-builder.json`、release metadata、GitHub 仓库地址
- 运行时 identity、IPC channel、CLI/runtime 参数前缀、协议名、日志 tag、userData 目录
- `@yulora/*` import alias 与相关源码引用
- `--yulora-*`、`data-yulora-*`、主题运行时协议、默认/fixture 主题资源
- `.codex/skills/yulora-*` 目录名与当前说明文本
- 受影响测试与打包脚本
Out of scope:
- `docs/plans/`、`docs/superpowers/`、`reports/task-summaries/`、`docs/decision-log.md`、`docs/test-report.md` 等历史记录追溯改写
- 为旧 `yulora` 前缀保留长期兼容别名
- 超出重命名范围的功能行为调整
Landing area:
- 根目录配置：`package.json`、`package-lock.json`、`electron-builder.json`、`vite.config.ts`、`vitest.config.ts`、`tsconfig.base.json`
- 主程序与 bridge：`src/main/`、`src/preload/`、`src/shared/`
- renderer / theme：`src/renderer/`、`fixtures/themes/`
- packages：`packages/editor-core/`、`packages/markdown-engine/`、`packages/test-harness/`
- 工具与发布：`scripts/`、`tools/`、`release-metadata/`
- 项目内 skills：`.codex/skills/`
Acceptance:
- 当前应用界面、窗口标题、打包产物、GitHub 发布配置显示 `FishMark`
- 代码中活跃协议与包前缀切到 `fishmark`
- 构建、类型检查、lint、测试通过
- 历史文档区域未被批量污染
Verification:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `rg -n "Yulora|yulora|@yulora|--yulora|data-yulora|yulora:"` 对活跃区域做残留复核
Risks:
- 打包发布配置与远端仓库名不同步会导致 release/upload 失效
- userData 目录与协议名前缀改动可能影响 dev/runtime 测试断言
- 主题 token 与 data attribute 全量迁移覆盖面大，容易遗漏样式或测试夹具
- 批量替换需避免误伤历史文档
Doc updates:
- `README.md`
- `docs/design.md`
- `docs/acceptance.md`
- `docs/test-cases.md`
- `docs/theme-packages.md`
- `docs/theme-authoring-guide.md`
- `docs/packaging.md`
- `docs/progress.md`
Next skill: $fishmark-task-execution
