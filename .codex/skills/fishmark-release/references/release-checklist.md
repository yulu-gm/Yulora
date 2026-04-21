# FishMark 正式发版检查清单

## 发版前

- 确认 `package.json` 的 `version`
- 确认 `release-metadata/release-notes.json` 存在且版本一致
- 确认 Release 标题和正文已按本次版本更新
- 确认目标平台范围
- 确认当前工作区没有会混入 release 的无关改动

## Windows 发版

1. 运行 `tools\release-win.bat`
2. 确认脚本成功生成：
   - `release/latest.yml`
   - `release/FishMark-Setup-<version>.exe`
   - `release/FishMark-Setup-<version>.exe.blockmap`
3. 确认 GitHub Release `v<version>` 已创建或复用
4. 确认 GitHub Release 标题和正文与元数据一致

## macOS 预留

- 仅在 `tools/release-macos.sh` 不再是占位入口后执行
- 当前若用户要求 macOS 发版，必须明确说明“流程已预留，但实现尚未接入”

## 收尾

- 记录本次已发布平台
- 记录失败点或阻塞项
- 输出简短发版总结
