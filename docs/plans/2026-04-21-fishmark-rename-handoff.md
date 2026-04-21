改了什么
- 将当前生效的产品品牌、运行时身份、打包发布配置、代码前缀与主题协议从 `Yulora/yulora` 迁移到 `FishMark/fishmark`
- 更新 `package.json`、`electron-builder.json`、release metadata、GitHub 仓库配置到 `FishMark`
- 将 `@yulora/*` import alias、`yulora:*` IPC channel、`--yulora-*` / `data-yulora-*` 主题协议迁移到 `fishmark`
- 重命名仓库内 `.codex/skills/yulora-*` 目录与当前 skill 文案
- 更新当前生效文档与测试断言，保留历史计划/总结/决策记录不追溯改写

落点文件
- 根配置：`package.json`、`package-lock.json`、`electron-builder.json`、`vite.config.ts`、`vitest.config.ts`、`tsconfig.base.json`
- 运行时与 bridge：`src/main/`、`src/preload/`、`src/shared/`
- renderer / 主题：`src/renderer/`、`src/renderer/theme-packages/`、`fixtures/themes/`
- 核心包：`packages/editor-core/`、`packages/markdown-engine/`、`packages/test-harness/`
- 工具与发布：`scripts/`、`tools/`、`release-metadata/`
- 文档与技能：`README.md`、`docs/design.md`、`docs/acceptance.md`、`docs/test-cases.md`、`docs/theme-*.md`、`docs/packaging.md`、`docs/progress.md`、`.codex/skills/`

推荐验证命令
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`

人工验收草稿
1. 运行 `npm run dev`，确认应用标题与空态文案显示 `FishMark`
2. 运行 `npm run dev:test-workbench`，确认测试工作台标题显示 `FishMark Test Workbench`
3. 打开设置页并切换主题，确认主题仍能正常加载，DOM 上的 `data-fishmark-*` / `--fishmark-*` 协议生效
4. 检查打包配置与发布脚本，确认仓库地址指向 `https://github.com/yulu-gm/FishMark.git`

已知风险或未做项
- 本地工作区目录仍是 `C:\\Users\\yulu\\Documents\\Yulora\\Yulora`，所以个别文档中的绝对本地路径没有随品牌名改成 `FishMark`
- 历史计划、历史总结、决策日志和测试报告按约定保留旧 `Yulora` 文案，因此仓库中仍会在历史区域看到旧名称
- `npm run build` 仍会提示 Vite 大 chunk warning，这是已有体积提醒，不是本次重命名引入的新失败
