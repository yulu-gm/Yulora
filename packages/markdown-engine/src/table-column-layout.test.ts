import { describe, expect, it } from "vitest";

import { computeTableColumnLayout } from "./table-column-layout";

describe("computeTableColumnLayout", () => {
  it("keeps metadata columns readable when a note column is much longer", () => {
    const layout = computeTableColumnLayout({
      header: ["Task", "Epic", "状态", "说明"],
      rows: [
        ["BOOTSTRAP-DOCS", "文档基线", "CLOSED", "文档基线已修正并关闭。"],
        [
          "TASK-001",
          "项目骨架",
          "CLOSED",
          "已通过独立评审；确认 Electron / Vite / React / TypeScript 开发壳可建立。"
        ],
        [
          "TASK-002",
          "项目结构",
          "DEV_DONE",
          "已建立 `apps/desktop`、`packages/editor-core`、`packages/markdown-engine`、`tests/e2e` 目录边界，同时保持根目录开发壳可运行。"
        ]
      ]
    });

    const [taskColumn, epicColumn, statusColumn, noteColumn] = layout;

    expect(taskColumn?.widthPercent).toBeGreaterThanOrEqual(19);
    expect(epicColumn?.widthPercent).toBeGreaterThanOrEqual(13);
    expect(statusColumn?.widthPercent).toBeGreaterThanOrEqual(13);
    expect(noteColumn?.widthPercent).toBeGreaterThan(50);
    expect(layout.reduce((sum, column) => sum + column.widthPercent, 0)).toBeCloseTo(100, 5);
  });

  it("gives equal width to columns with equal readable content", () => {
    const layout = computeTableColumnLayout({
      header: ["A", "B", "C"],
      rows: [["1", "2", "3"]]
    });

    for (const column of layout) {
      expect(column.widthPercent).toBeCloseTo(100 / 3, 5);
    }
  });
});
