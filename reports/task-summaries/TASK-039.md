# TASK-039 分割线渲染
日期：2026-04-16
状态：DEV_DONE

## 本轮完成内容

- 在 `packages/markdown-engine/src/` 中新增 top-level `thematicBreak` block，并为 `---` 与 `+++` 两类分割线保留精确 offset、line range 与 marker 信息
- 复用现有 `micromark` 事件流处理标准 `---` 分割线，同时为 `+++` 增加一层窄范围的 Yulora 扩展识别，只在 top-level 单行、三个及以上同字符时生效
- 在 `src/renderer/code-editor.ts` 的现有 CodeMirror decoration 派生链里接入分割线的非激活态渲染，不新增第二份文档模型
- 分割线在非激活态显示为连续横线，光标回到对应行后立即恢复原始 Markdown 源码
- 补充 `packages/editor-core/src/active-block.test.ts`、`packages/markdown-engine/src/parse-block-map.test.ts` 与 `src/renderer/code-editor.test.ts` 回归测试，覆盖 parser、active block、渲染切换与 CRLF 文档替换边界
- 修复了 `+++` 只有在前后空行包裹时才会生效的缺口；现在即使 `+++` 直接贴着相邻正文行，也会被从 paragraph token 中拆成独立分割线并正确渲染

## 主要改动文件

- `packages/markdown-engine/src/block-map.ts`
- `packages/markdown-engine/src/index.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/parse-block-map.test.ts`
- `packages/editor-core/src/active-block.test.ts`
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/styles.css`
- `docs/plans/2026-04-16-task-039-intake.md`
- `docs/decision-log.md`
- `docs/test-cases.md`
- `docs/test-report.md`
- `docs/progress.md`
- `MVP_BACKLOG.md`

## 已验证内容

- `npm.cmd run test -- packages/markdown-engine/src/parse-block-map.test.ts`
- `npm.cmd run test -- packages/editor-core/src/active-block.test.ts`
- `npm.cmd run test -- src/renderer/code-editor.test.ts`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`

## 残余风险

- 当前只支持 `---` 与 `+++` 两类分割线，不包含 `***`、`___` 或更宽松的 Markdown 方言变体
- `+++` 是项目显式接受的窄扩展语法，后续如果要引入更完整的 Markdown 方言策略，需要再回到 parser 层统一梳理
- `---` 在无空行场景下仍保持 CommonMark / setext heading 既有语义，本轮 bugfix 只收紧到 `+++` 的项目扩展分支
- 本轮仍未补单独的桌面人工验收记录，因此 `docs/progress.md` 先记为 `DEV_DONE`，未提升到 `CLOSED`


## 2026-04-16 Bugfix Addendum

- 修复 +++
分割线
- 会被整段误判成 setextHeading，进而让上方 +++ 分割线失效的问题。
- parser 现在会在 setextHeading token 中优先拆出显式的 +++ 分割线；单个 - 仍保留为普通文本，不会被误渲染成分割线。
