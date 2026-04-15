# TASK-012 列表与任务列表渲染

日期：2026-04-15
状态：DEV_DONE

## 本轮完成内容

- 在 `packages/markdown-engine/src/` 为 `ListBlock` 增补 item-level metadata，覆盖 marker、indent、task marker 和 checked 状态。
- 在 `src/renderer/code-editor.ts` 现有 inactive-state decoration pipeline 中补齐无序列表、有序列表和任务列表的非激活态渲染。
- 在同一编辑器边界内实现列表 `Enter` 续项、ordered marker 递增、空项退出规则，并保持默认非列表 `Enter` 行为不变。
- 为 editor test driver 增加 `set-editor-selection` 与 `press-editor-enter` 两个最小命令。
- 在 `packages/test-harness` 中新增 `list-enter-behavior-basic` scenario 与 fixture，用于回归 task list 的续项与空项退出路径。

## 主要改动文件

- `packages/markdown-engine/src/block-map.ts`
- `packages/markdown-engine/src/index.ts`
- `packages/markdown-engine/src/parse-block-map.ts`
- `packages/markdown-engine/src/parse-block-map.test.ts`
- `src/renderer/code-editor.ts`
- `src/renderer/code-editor.test.ts`
- `src/renderer/code-editor-view.tsx`
- `src/renderer/editor-test-driver.ts`
- `src/renderer/editor-test-driver.test.ts`
- `src/renderer/App.tsx`
- `src/renderer/styles.css`
- `src/shared/editor-test-command.ts`
- `packages/test-harness/src/handlers/electron-ipc.ts`
- `packages/test-harness/src/handlers/electron.ts`
- `packages/test-harness/src/handlers/electron.test.ts`
- `packages/test-harness/src/scenarios/index.ts`
- `packages/test-harness/src/scenarios/list-enter-behavior-basic.ts`
- `packages/test-harness/src/registry.test.ts`
- `fixtures/test-harness/list-enter-behavior-basic.md`

## 已验证内容

- `npm run test -- packages/markdown-engine/src/parse-block-map.test.ts`
- `npm run test -- src/renderer/code-editor.test.ts`
- `npm run test -- src/renderer/editor-test-driver.test.ts`
- `npm run test -- packages/test-harness/src/handlers/electron.test.ts packages/test-harness/src/registry.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## 残余风险

- 本轮没有做真实桌面壳的人体验收，因此 `docs/progress.md` 先记为 `DEV_DONE`，未提升为 `CLOSED`。
- 空项退出当前采用“清空当前 list line 文本”的最小策略，后续若要更贴近 Typora 的多层 dedent 语义，还需要继续补细分回归。
- `list-enter-behavior-basic` scenario 目前覆盖 task list 的续项与退出；若后续 ordered / nested list 语义继续演进，建议再补独立 scenario。
