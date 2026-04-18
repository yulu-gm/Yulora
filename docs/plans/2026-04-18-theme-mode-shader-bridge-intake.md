Task: 主题模式到 shader 参数桥
Goal: 让 shader runtime 自动感知当前主题模式，在 light/dark 切换时无需额外设置项即可切换效果。
In scope:
- 把 renderer 已解析出的主题模式桥接进 shader scene uniform 流
- 约定 light/dark 的数值映射，并补单元测试
- 更新主题文档，说明 shader 如何读取该内建 uniform
Out of scope:
- 新增 manifest 字段
- 改动 main / preload bridge
- 新增设置项或主题作者手动同步参数的 UI
Landing area:
- `src/renderer/editor/App.tsx`
- `src/renderer/editor/ThemeSurfaceHost.tsx`
- `src/renderer/shader/theme-scene-state.ts`
- `src/renderer/shader/theme-scene-state.test.ts`
- `src/renderer/editor/ThemeSurfaceHost.test.tsx`
- `docs/theme-packages.md`
- `docs/theme-authoring-guide.md`
Acceptance:
- 活跃 shader surface 能收到当前主题模式对应的 uniform
- `light` 映射为 `0`，`dark` 映射为 `1`
- 切换主题模式时无需手调 theme parameter 也能驱动 shader 分支
Verification:
- `npm.cmd run test -- src/renderer/shader/theme-scene-state.test.ts src/renderer/editor/ThemeSurfaceHost.test.tsx`
- `npm.cmd run test -- src/renderer/app.autosave.test.ts`
- `npm.cmd run typecheck`
Risks:
- 需避免覆盖主题作者现有参数 uniform
- 需保持 shader fallback / reduced-motion 现有行为不回归
- 需保持 light/dark 解析仍以 renderer 的 resolved theme mode 为唯一事实源
Doc updates:
- 更新 `docs/theme-packages.md`
- 更新 `docs/theme-authoring-guide.md`
Next skill: $test-driven-development
