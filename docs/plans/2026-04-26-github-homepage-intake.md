# GitHub homepage intake

Task: github-homepage

Goal: 将用户提供的 FishMark 静态主页纳入仓库，并接入 GitHub Pages 发布入口，避免替换 Electron renderer 的应用入口。

In scope:
- 新增可独立预览和发布的静态主页目录。
- 新增 GitHub Pages workflow，使 `main` 分支更新后可发布主页资源。
- 补充最小项目说明，指出主页目录与本地预览方式。
- 增加结构测试，锁定主页入口、GitHub 链接和 Pages workflow 配置。

Out of scope:
- 不改 Electron / React / CodeMirror 应用入口。
- 不改变编辑器运行时行为、打包逻辑或发布版本号。
- 不处理自定义域名、GitHub Pages 仓库设置开关或 release 产物上传。

Landing area:
- `site/index.html`
- `.github/workflows/pages.yml`
- `src/main/github-pages-site.test.ts`
- `README.md`
- `docs/plans/2026-04-26-github-homepage-handoff.md`

Acceptance:
- 主页文件来自 `C:/Users/wuche/Downloads/index.html`，保留现有 GitHub / releases 链接。
- GitHub Pages workflow 从 `site/` 上传静态页面资源，并只在 `main` 分支 push 或手动触发时运行。
- Electron renderer 入口 `src/renderer/index.html` 不被替换。
- 结构测试覆盖主页入口和 workflow 关键配置。

Verification:
- `npm run test -- src/main/github-pages-site.test.ts`
- 手工抽查 `site/index.html` 可直接打开，并包含 FishMark / GitHub / releases 链接。

Risks:
- 不触及 IME / 光标 / undo-redo / autosave / round-trip。
- 需要在 GitHub 仓库 Settings > Pages 中选择 GitHub Actions 作为 source，workflow 才能实际发布。

Doc updates:
- `README.md`
- `docs/plans/2026-04-26-github-homepage-handoff.md`

Next skill: $fishmark-task-execution
