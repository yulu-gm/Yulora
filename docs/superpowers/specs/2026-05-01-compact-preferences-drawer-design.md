# Compact Preferences Drawer Design

Date: 2026-05-01
Scope: renderer settings drawer density and navigation width

## Goal

Settings 分类继续保留在偏好设置抽屉内部，不移动到全局 rail。当前抽屉已经支持左侧可展开分类导航，但整体偏宽、间距偏松。此次只做视觉密度收敛，让设置页更像轻量桌面抽屉，而不是独立 Preferences 窗口。

## Approved Direction

- 保留设置分类在抽屉内部。
- 不把分类移动到 rail。
- 不改变设置分类、偏好字段、保存逻辑或 renderer/main/preload/shared 合同。
- 只调整 `settings.css` 中的宽度、间距、导航行高、缩进和字号。

## Layout Changes

桌面宽度下：

- `.settings-shell` 从 `760px` 收敛到 `700px`。
- `.settings-body` 左侧导航列从 `184px` 收敛到 `148px`。
- body gap 从 `space-5` 收敛到 `space-4`。
- body padding 从 `space-5` 收敛到 `space-4`。
- header 和 footer padding 同步降低一个密度等级。

导航密度：

- 父级分类行高从 `36px` 收敛到 `32px`。
- 子分类行高从 `32px` 收敛到 `28px`。
- 父级图标列和缩进收窄。
- 子分类左缩进减少，让层级仍清楚但不浪费横向空间。
- 导航字号下调到不低于 `0.82rem`。

右侧内容：

- settings group 间距从 `space-6` 收敛到 `space-5`。
- group 顶部 padding 从 `space-5` 收敛到 `space-4`。
- row 垂直 padding 从 `space-3` 收敛到 `space-2`。
- 控件最小高度保持可点击，不压到难以操作。

## Responsive Behavior

- `max-width: 860px` 下继续保持导航在顶部横向滚动。
- `max-width: 640px` 下继续占满可用抽屉宽度。
- 不引入 rail 交互，不改变阅读模式 rail 收起逻辑。

## Testing

更新现有 CSS contract 测试，使其断言新的紧凑宽度和导航列宽：

- drawer 宽度 `700px`
- settings body 列宽 `148px minmax(0, 1fr)`
- compact navigation selector 仍存在

运行：

- `npm run test -- src/renderer/app.autosave.test.ts -t "nested navigation drawer|semi-transparent glass drawer"`
- `npm run test -- src/renderer/app.autosave.test.ts -t "settings"`

## Out Of Scope

- 不移动设置分类到 rail。
- 不改设置数据模型。
- 不新增分类或控件。
- 不做新的 visual mock 或 Playwright 视觉测试。
