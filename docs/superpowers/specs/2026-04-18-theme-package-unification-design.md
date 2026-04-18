# Theme Package Unification Design

## Goal

将当前仓库中并存的“legacy theme family”和“manifest theme package”两条主题链路，收敛为唯一正式主题协议：`manifest.json` 驱动的 theme package。

统一后需要满足：

- 仓库内只保留一套主题发现、加载、解析、fallback 机制
- 内置主题只保留 `default`
- `default` 必须同时支持 `light` 和 `dark`
- `default` 承担所有 fallback 主题职责
- `rain-glass` 不再作为内置主题参与运行时默认扫描，而是作为第一个外部主题包发布
- 不保留兼容代码、过渡分支、legacy 目录兼容或旧 id 迁移逻辑

## Scope

本设计覆盖：

- 主题资源目录结构
- main 进程主题扫描服务
- preload 暴露的主题 bridge
- renderer 主题 catalog、runtime、fallback 解析
- 默认主题资源迁移
- `rain-glass` 的外部包定位
- 相关测试、文档和开发脚本更新

本设计不覆盖：

- 在线主题市场
- 主题签名或沙箱增强
- 新主题参数类型
- 新 shader surface 类型
- 主题制作指南正文

主题制作指南会在本次架构统一完成后再编写。

## Current Problems

当前实现的主要问题不是“功能不够”，而是“正式协议不唯一”。

### 1. main 进程仍然保留两套主题发现逻辑

当前仓库中同时存在：

- `theme-service.ts`
  - 扫描 `themes/<id>/light|dark/*.css`
  - 只理解 `tokens/ui/editor/markdown`
- `theme-package-service.ts`
  - 扫描 `themes/<id>/manifest.json`
  - 理解 tokens、styles、layout、scene、surfaces、parameters

这意味着“什么叫一个合法主题”在 main 侧并没有唯一答案。

### 2. renderer 侧仍然保留兼容适配层

renderer 现在虽然已经以 theme package runtime 为主，但仍然存在：

- 旧 theme family 到 package descriptor 的适配逻辑
- legacy id 兼容逻辑
- “如果 package catalog 不可用或为空，则回退到旧 family 数据”的双通道思维

这使得 renderer 的真实边界变得模糊，也让后续主题作者无法从代码中直接读出唯一契约。

### 3. 内置默认主题不是正式主题包

当前 `default` 主题的 light/dark 样式仍以内置 CSS 目录和代码生成 descriptor 的方式参与运行时。

这会导致：

- 内置主题和外部主题不是完全同构
- fallback 虽然稳定，但不是通过正式 package 协议完成
- 以后编写主题指南时，必须解释“默认主题是特殊的”

### 4. 旧目录结构仍被视为合法输入

如果继续允许旧目录：

```text
themes/<id>/
  light/
    tokens.css
    ui.css
  dark/
    ...
```

那仓库就永远存在“正式协议”和“兼容协议”并存的问题。由于本次任务明确禁止兼容代码，所以该结构必须被视为废弃且不再识别。

## Recommendation

采用“唯一 theme package 协议 + 单一内置默认主题 + 外部主题统一同构”的模型。

### Recommendation Summary

- 唯一正式主题协议：`ThemePackageManifest`
- 唯一内置主题：`default`
- 唯一官方 fallback：`default`
- 唯一主题 bridge：`listThemePackages()` / `refreshThemePackages()`
- 唯一 renderer 输入：`ThemePackageDescriptor[]`
- 唯一社区主题目录契约：`<userData>/themes/<id>/manifest.json`

没有 legacy family。没有 family/package 双轨。没有旧 id 迁移。

## Unified Theme Model

统一后的主题系统只区分“来源”，不区分“协议”。

### Theme Sources

1. builtin theme package
   - 当前仅 `default`

2. community theme package
   - 位于 `<userData>/themes/<id>/`

两者都必须满足同一份 manifest schema。

## Directory Layout

### Builtin theme packages

建议将内置主题资源整理到专门目录：

```text
src/renderer/theme-packages/
  default/
    manifest.json
    tokens/
      light.css
      dark.css
    styles/
      ui.css
      editor.css
      markdown.css
      titlebar.css
    layout/
      titlebar.json
```

说明：

- `tokens/light.css` 和 `tokens/dark.css` 继续保留 mode 拆分
- `styles/ui.css`、`styles/editor.css`、`styles/markdown.css`、`styles/titlebar.css` 统一为单文件
- 单文件内部通过 `:root` 与 `:root[data-yulora-theme="dark"]` 区分 mode
- 如果默认主题实际上不需要 `titlebar.css` 或 `layout/titlebar.json`，可以不声明

### Community theme packages

```text
<userData>/themes/
  rain-glass/
    manifest.json
    tokens/
      dark.css
    styles/
      ui.css
      editor.css
      markdown.css
      titlebar.css
    layout/
      titlebar.json
    shaders/
      workbench-background.glsl
      titlebar-backdrop.glsl
    assets/
      textures/
        rain-window-scene.png
```

说明：

- 外部主题必须是完整 theme package
- 没有 `manifest.json` 的目录直接视为无效，不参与扫描
- 旧 `themes/<id>/light/*.css` 目录不再识别

## Manifest Contract

统一后唯一正式 contract 仍然是当前 `ThemePackageManifest`，不新增第二种主题 schema。

```ts
type ThemePackageManifest = {
  id: string;
  name: string;
  version: string;
  author: string | null;
  supports: { light: boolean; dark: boolean };
  tokens: Partial<Record<"light" | "dark", string>>;
  styles: Partial<Record<"ui" | "editor" | "markdown" | "titlebar", string>>;
  layout: { titlebar: string | null };
  scene: { id: string; sharedUniforms: Record<string, number> } | null;
  surfaces: Partial<Record<ThemeSurfaceSlot, ThemeSurfaceDescriptor>>;
  parameters: ThemeParameterDescriptor[];
};
```

本次不扩展出“mode-specific styles”字段。

原因：

- `default` 当前 `ui/editor/markdown` 的 light/dark 差异可以安全收敛到单文件内
- 保持 schema 稳定比为了兼容旧目录去扩展 manifest 更重要
- 单一 schema 更利于后续主题制作指南和验收标准统一

## Runtime Resolution

renderer 只保留一套 active theme resolution 流程：

1. 根据 `preferences.theme.mode` 解析出 `resolvedMode`
2. 读取 `preferences.theme.selectedId`
3. 在 theme package catalog 中查找该 id
4. 如果不存在，fallback 到 builtin `default`
5. 如果存在但不支持当前 mode，fallback 到 builtin `default`
6. 如果存在且支持当前 mode，则激活该 theme package

### Fallback Rules

fallback 规则必须唯一且明确：

- `selectedId === null`
  - 直接使用 builtin `default`
- `selectedId` 不存在
  - 使用 builtin `default`
  - `fallbackReason = "missing-theme"`
- `selectedId` 存在但 `supports[resolvedMode] === false`
  - 使用 builtin `default`
  - `fallbackReason = "unsupported-mode"`

不允许：

- 回退到旧 theme family
- 回退到某个“最近一次成功主题”
- 动态改写 `preferences.theme.selectedId`

## Main Process Changes

main 进程只保留一个主题扫描服务。

### Keep

- `theme-package-service.ts`

### Remove

- `theme-service.ts`
- `ThemeFamilyDescriptor`
- 任何 legacy css family 目录扫描逻辑
- `legacy-css-family` kind

### New Responsibility

`theme-package-service.ts` 统一负责：

- 扫描 builtin `default`
- 扫描 `<userData>/themes/*`
- 返回统一的 `ThemePackageDescriptor[]`

扫描规则：

- builtin 主题目录固定且显式
- community 目录只接受带 `manifest.json` 的 package
- manifest 不合法则直接跳过
- 不做 legacy 降级识别

## Preload Changes

preload 层只暴露 package bridge。

### Keep

- `yulora:list-theme-packages`
- `yulora:refresh-theme-packages`

### Remove

- `yulora:list-themes`
- `yulora:refresh-themes`
- 相关 renderer typings
- 相关 preload contract tests

这样 renderer 不会再获得“旧主题目录”这类第二套输入。

## Renderer Changes

renderer 只保留 package-first，并进一步收口为 package-only。

### Keep

- `theme-package-runtime.ts`
- `theme-package-catalog.ts`
- manifest parameter / shader / titlebar 解析能力

### Remove

- `theme-catalog.ts`
- 旧 `ThemeDescriptor` family 解析路径
- `toLegacyRuntimeThemePackageEntry(...)`
- `resolveLegacyThemeFamilyId(...)`
- 任何旧 id suffix 兼容逻辑
- 任何“themePackages 为空时改走 themes”的 fallback 分支

### Simplified Renderer Model

`App.tsx` 中主题相关状态最终只应保留：

- package catalog
- active package resolution
- active package manifest
- active package parameters
- active package surfaces

renderer 不再知道“theme family”这个历史概念。

## Default Theme Migration

`default` 需要从“内置 CSS 目录 + 代码硬编码 descriptor”迁移为“真正的 builtin theme package”。

### Migration Requirements

1. `default` 必须拥有 `manifest.json`
2. `default` 必须显式声明：
   - `id = "default"`
   - `supports.light = true`
   - `supports.dark = true`
3. `default` 的 tokens 保持 mode 分离：
   - `tokens/light.css`
   - `tokens/dark.css`
4. `default` 的 `ui/editor/markdown` 改为单文件多 mode 规则
5. runtime fallback 不再调用硬编码 builtin descriptor 生成函数

### Why Single-File Styles Are Preferred Here

不推荐为了迁移默认主题去扩展 manifest schema 支持：

- `styles.light.ui`
- `styles.dark.ui`
- `styles.light.editor`
- `styles.dark.editor`

因为这会把“为旧结构让路”的复杂度固化进正式协议。

更好的做法是：

- 保持正式协议简单
- 让 `default` 主动适配到正式协议

## Rain Glass Positioning

统一后，`rain-glass` 的定位应当改变：

- 不再是内置主题
- 不参与 fallback
- 不出现在 builtin package catalog 中
- 作为第一个外部 theme package 发布

### Repository Role

仓库内可保留：

- `fixtures/themes/rain-glass/`

其用途是：

- 外部主题包开发样例
- 自动化测试 fixture
- 本地开发时通过脚本同步到 dev 用户目录

不应再把它当成内置资源路径。

## Dev And Fixture Changes

开发体验需要保持，但不能重新引入兼容机制。

### Keep

- `scripts/sync-dev-themes.mjs`

### Update

- 脚本只同步 external fixture theme packages 到 dev `userData/themes`
- 内置 `default` 不通过该脚本同步
- `rain-glass` 继续作为 fixture 被同步

这样开发态仍然可以方便验证外部主题包，但运行时契约保持干净。

## Tests

本次改造必须先锁定 contract，再改实现。

### Tests To Add Or Update

#### Main

- `src/main/theme-package-service.test.ts`
  - 扫描 builtin `default`
  - 扫描 community manifest packages
  - 跳过无 manifest 目录
  - 跳过 manifest 非法目录
  - 不再识别 legacy css family

#### Preload

- `src/preload/preload.test.ts`
- `src/preload/preload.contract.test.ts`
  - 删除旧 `listThemes` / `refreshThemes` 断言
  - 只验证 package bridge

#### Renderer Runtime

- `src/renderer/theme-package-runtime.test.ts`
  - 继续验证样式挂载顺序
- 删除或重写 `src/renderer/theme-runtime.test.ts`
  - 不再保留 family runtime 专属职责

#### App Integration

- `src/renderer/app.autosave.test.ts`
  - 只使用 `listThemePackages()` stub
  - `default` fallback 行为
  - missing-theme warning
  - unsupported-mode warning
  - external `rain-glass` 参数和 surface 仍然生效

#### Manual Test Docs

- `docs/test-cases.md`
  - 主题测试步骤只保留 package 目录
  - 明确旧目录不再有效

## Risks

### 1. Default theme migration may ripple through many tests

这是预期风险。

因为当前很多测试默认假设：

- builtin default 通过代码生成 descriptor 存在
- old theme catalog 仍然可用

本次统一后，这些测试都要显式改为 package-only 语义。

### 2. Theme runtime responsibilities may need one more round of cleanup

如果 `theme-runtime.ts` 与 `theme-package-runtime.ts` 存在重复职责，本次应优先保证正式契约唯一。

如果文件仍然存在，也必须只保留 package-only 职责，不能保留旧 family 时代概念。

### 3. External theme breakage is intentional

旧 community 目录结构失效是本次显式接受的 breaking change。

这是必要代价，因为任务要求明确禁止兼容代码和临时代码。

## Non-Goals

本次不做：

- 自动把旧目录转换成 manifest package
- 自动迁移旧 `selectedId`
- 在 UI 中提示“旧主题格式已废弃”
- 在运行时兜底识别旧目录

这些都属于兼容行为，不符合本次任务目标。

## Acceptance

满足以下条件时，本任务才算完成：

1. 仓库内只存在一种正式主题协议：manifest theme package
2. 内置主题只保留 `default`
3. `default` 同时支持 `light` 和 `dark`
4. 缺失主题时，应用回退到 builtin `default`
5. 不支持当前 mode 的主题时，应用回退到 builtin `default`
6. `main`、`preload`、`renderer` 中不再存在 legacy family、legacy id 或兼容分支
7. 旧 `themes/<id>/light|dark/*.css` 目录不再被识别
8. `rain-glass` 作为外部 theme package 仍然可安装、可选择、可运行
9. 设置页仍能完成：
   - 主题选择
   - 主题刷新
   - 主题参数调整
   - effects mode 调整
10. build 通过
11. lint 通过
12. typecheck 通过
13. 相关测试通过

## Task Breakdown

### Task 1: Lock the package-only contract with failing tests

- Update: `src/main/theme-package-service.test.ts`
- Update: `src/preload/preload.test.ts`
- Update: `src/preload/preload.contract.test.ts`
- Update: `src/renderer/app.autosave.test.ts`

Checks:

- 明确 builtin `default` 存在
- 明确 legacy css family 不再被识别
- 明确 renderer 只依赖 `listThemePackages()`

### Task 2: Remove legacy theme discovery and bridge code

- Delete: `src/main/theme-service.ts`
- Delete: `src/main/theme-service.test.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.d.ts`

Checks:

- bridge 中不再暴露 `listThemes()` / `refreshThemes()`
- 类型层不再出现旧 theme family 描述符

### Task 3: Convert builtin default into a real theme package

- Create or move: `src/renderer/theme-packages/default/**`
- Migrate: existing default theme CSS into package layout
- Add: `manifest.json`

Checks:

- default light/dark 均可正常加载
- fallback 不再依赖硬编码 builtin descriptor

### Task 4: Collapse renderer to package-only resolution

- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/theme-package-catalog.ts`
- Delete or heavily reduce: `src/renderer/theme-catalog.ts`
- Delete or refactor: `src/renderer/theme-runtime.ts`

Checks:

- renderer 中不再存在 legacy package adapter
- active theme resolution 只依赖 package catalog

### Task 5: Externalize rain-glass and update dev fixtures

- Keep/update: `fixtures/themes/rain-glass/**`
- Modify: `scripts/sync-dev-themes.mjs`

Checks:

- `rain-glass` 不再内置
- `rain-glass` 仍可作为外部 theme package 在开发环境中被同步和验证

### Task 6: Refresh docs and manual acceptance

- Update: `docs/theme-packages.md`
- Update: `docs/test-cases.md`
- Add later: standalone theme authoring guide

Checks:

- 文档中不再把旧 family 目录当成正式方案
- 文档中的验收步骤与 package-only 实现一致

## Decision

本设计选择：

- 单一正式主题协议：manifest theme package
- 单一内置主题：`default`
- `rain-glass` 外部化
- 零兼容代码

这是后续实现和主题指南的唯一基础。
