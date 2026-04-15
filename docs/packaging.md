# Yulora 打包说明

## Windows 本地打包

当前仓库已经提供本地 Windows 打包入口，可生成可安装的 NSIS `.exe`。

### 前置条件

- Windows
- 已安装 Node.js 与 npm
- 已在仓库根目录执行 `npm install` 或 `npm ci`

### 执行命令

```bash
npm run package:win
```

这条命令会先执行现有 `npm run build`，再调用 `electron-builder` 生成 Windows 安装器。

### 产物输出

安装器输出到：

```text
release/
```

### 当前限制

- 当前只覆盖 Windows 本地打包
- macOS `.dmg` / `.zip` 仍属于 `TASK-038` 后续切片
- 代码签名尚未配置
- 自动更新尚未配置
- 如果后续没有补正式图标资源，安装器会继续使用默认 Electron 图标

### 后续扩展位

- Windows / macOS 代码签名
- macOS 打包产物
- 自动更新接入
- 正式图标与安装器视觉定制
