# GitHub homepage handoff

Task: github-homepage

## 改了什么

- 将 `C:/Users/wuche/Downloads/index.html` 接入为仓库内静态主页：`site/index.html`。
- 新增 GitHub Pages workflow：`.github/workflows/pages.yml`，在 `main` 分支的 `site/**` 或 workflow 变更后发布，也支持手动触发。
- 保留 Electron renderer 入口 `src/renderer/index.html`，避免把产品应用入口替换成 marketing 页面。
- 为所有新标签页外链补充 `rel="noopener noreferrer"`。
- 在 `README.md` 增加项目主页位置与 GitHub Pages 发布说明。
- 新增结构测试，覆盖主页入口、GitHub 链接、导航锚点、外链安全属性和 Pages workflow 关键配置。

## 落点文件

- `.github/workflows/pages.yml`
- `site/index.html`
- `src/main/github-pages-site.test.ts`
- `README.md`
- `docs/plans/2026-04-26-github-homepage-intake.md`
- `docs/plans/2026-04-26-github-homepage-handoff.md`

## 推荐验证命令

- `npm.cmd run test -- src/main/github-pages-site.test.ts`

## 人工验收草稿

1. 打开 `site/index.html`，确认页面显示 FishMark 主页。
2. 点击顶部 `GitHub`、底部 `GitHub`、`发布记录`、`文档`，确认跳转到 `https://github.com/yulu-gm/FishMark` 相关页面。
3. 点击顶部 `特性`、`快捷键`、`技术栈`、`下载`，确认站内锚点能滚动到对应区域。
4. 在 GitHub 仓库 Settings > Pages 中选择 GitHub Actions 作为 source 后，push 到 `main` 并确认 `Deploy GitHub Pages` workflow 成功。

## 已知风险或未做项

- GitHub Pages 是否真正发布，仍依赖仓库 Pages 设置启用 GitHub Actions source。
- 本轮没有新增自定义域名、截图资源或 release 产物生成逻辑。
- 本轮不触及 Electron 应用 runtime，因此不需要跑完整编辑器门禁。
