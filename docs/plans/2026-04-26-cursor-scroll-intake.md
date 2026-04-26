# Cursor Scroll Intake

Date: 2026-04-26

Goal: 修复使用上下键移动光标时，编辑器滚动位置没有立即跟随自定义语义导航光标的缺陷。

## In Scope

- 定位 ArrowUp / ArrowDown 光标移动与 CodeMirror 滚动 transaction 的关系。
- 修复 FishMark 自定义语义 Arrow 导航的滚动请求缺失。
- 补回归测试覆盖语义命令层和 CodeMirror adapter 层。

## Out of Scope

- 改动编辑器整体布局、滚动容器结构或主题视觉样式。
- 调整非 Arrow 导航行为。
- 引入延时、节流、轮询或浏览器兼容兜底。

## Acceptance

- 自定义 ArrowUp / ArrowDown 导航在移动 selection 时会请求 CodeMirror 把光标滚入视口。
- 默认 CodeMirror Arrow 导航和 FishMark 自定义 Arrow 导航的滚动语义一致。
- 相关命令、adapter、编辑器测试通过。

## Risks

- 自定义导航覆盖表格、隐藏 Markdown 标记和块级转换区域，修复必须落在统一命令路径，避免只补单一场景。
- 若只通过 DOM 手动滚动修复，会绕过 CodeMirror 的 measurement / virtual scroll 机制，产生新的光标定位问题。

