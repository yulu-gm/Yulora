# TASK-038 图标清晰度与鱼身填充 Handoff

## 改了什么

- 将 `assets/branding/fishmark_logo_light.svg` / `assets/branding/fishmark_logo_dark.svg` 中的鱼形区域补为黑色实体层。
- 保留 light 图标鱼眼的反白细节，避免黑色鱼形完全失去识别点。
- 将 `scripts/generate-icons.mjs` 的 PNG 输出扩展到 `16/24/32/48/64/128/256/512`。
- 将 Windows `.ico` 内嵌尺寸扩展到 `16/24/32/48/64/128/256`，减少桌面/快捷方式在常用尺寸上的系统插值。
- 在 `src/main/generate-icons.test.ts` 中补充回归：
  - 验证 PNG 与 ICO 尺寸集合。
  - 验证 light 图标中心鱼身像素为 `rgba(0,0,0,255)`。

## 落点文件

- `assets/branding/fishmark_logo_light.svg`
- `assets/branding/fishmark_logo_dark.svg`
- `scripts/generate-icons.mjs`
- `src/main/generate-icons.test.ts`
- `docs/plans/2026-05-10-task-038-icon-refresh-intake.md`
- `docs/plans/2026-05-10-task-038-icon-refresh-handoff.md`

## 已跑验证

- `npm.cmd run test -- src/main/generate-icons.test.ts`
- `npm.cmd run test -- src/main/generate-icons.test.ts src/main/package-scripts.test.ts src/main/after-pack-win-icon.test.ts`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run package:win`

## 额外检查

- `build/icons/light/icon-512.png` 中心像素：`rgba(0,0,0,255)`。
- `build/icons/light/icon.ico` 尺寸：`16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256`。
- `release/win-unpacked/resources/icons/light/icon.ico` 尺寸同上。
- Windows package 日志显示已执行：`Patched Windows executable icon: ...\release\win-unpacked\FishMark.exe`。

## 人工验收建议

1. 安装或覆盖安装 `release/FishMark-Setup-0.2.4.exe`。
2. 在桌面快捷方式上切换不同图标大小，确认 FishMark 图标不再明显发糊。
3. 确认图标中间鱼身是黑色实体，鱼眼保留为反白小孔。

## 状态同步说明

- `TASK-038` 仍是跨平台打包大任务，本轮只修 Windows/light 图标观感与生成尺寸，不把 `MVP_BACKLOG.md` 的“两个平台的产物元信息与图标”整项标为完成。
- 工作区已有与本轮无关的 `MVP_BACKLOG.md` 修改，已保持不动。
