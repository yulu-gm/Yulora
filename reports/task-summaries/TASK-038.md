# TASK-038 跨平台打包

## 当前状态

状态：DEV_IN_PROGRESS

本轮结果：PASS（icon-refresh 子切片）

`TASK-038` 仍是跨平台打包大任务；本轮只验收 Windows/light 图标清晰度与鱼身填充修复，不把整个跨平台打包任务标为完成。

## 本轮完成内容

- 修复 light/dark SVG 源图中鱼形区域主要依赖透明镂空的问题，生成后的 light 图标鱼身为黑色实体。
- 保留 light 图标鱼眼反白小孔，避免图标变成不可辨识的纯黑鱼形。
- 扩展 icon 生成尺寸：PNG 输出 `16/24/32/48/64/128/256/512`，Windows `.ico` 内嵌 `16/24/32/48/64/128/256`。
- 补充 `src/main/generate-icons.test.ts` 回归，覆盖 `.ico` 尺寸集合与 light 图标中心黑色像素。
- 已重新生成本地 `build/icons`，并重新产出 Windows package。

## 验证

- `npm.cmd run test -- src/main/generate-icons.test.ts`：先失败后通过。
- `npm.cmd run test -- src/main/generate-icons.test.ts src/main/package-scripts.test.ts src/main/after-pack-win-icon.test.ts`：通过，3 个文件、34 项。
- `npm.cmd run lint`：通过。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run build`：通过，保留既有 Vite chunk size warning。
- `npm.cmd run package:win`：通过，生成 `release/FishMark-Setup-0.2.4.exe`，并 patch `release/win-unpacked/FishMark.exe` 图标。

## 人工验收

1. 安装或覆盖安装 `release/FishMark-Setup-0.2.4.exe`。
2. 在桌面快捷方式或开始菜单中切换不同图标大小。
3. 确认 FishMark 图标中间鱼身为黑色实体，鱼眼为反白小孔。
4. 确认桌面常用图标大小下不再明显发糊。

## 剩余风险

- Windows 可能缓存旧快捷方式图标；若覆盖安装后仍看到旧图标，需要刷新图标缓存或重新创建快捷方式再验收。
- macOS `.icns` 仍不在本轮范围内。
