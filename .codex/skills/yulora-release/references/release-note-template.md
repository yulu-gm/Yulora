# Yulora Release Note 模板

`release-metadata/release-notes.json` 的推荐结构：

```json
{
  "version": "0.1.2",
  "title": "Yulora 0.1.2 Release",
  "body": "### 本次更新\n\n- ...\n- ..."
}
```

## 标题规则

- 推荐格式：`Yulora <version> Release`
- 不要在标题里塞实现细节

## 正文归纳规则

- 优先写用户可感知变化
- 再写分发、更新、兼容性等必要说明
- 不要只复制 commit message
- 不要把内部重构流水账直接发到 GitHub Release

## 正文模板

```md
### 本次更新

- 用户可感知变化 1
- 用户可感知变化 2
- 必要的分发或兼容性说明
```
