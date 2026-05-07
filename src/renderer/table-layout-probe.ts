import "./styles/base.css";
import "./styles/primitives.css";
import "./styles/editor-source.css";
import "./styles/markdown-render.css";

import { createCodeEditorController } from "./code-editor";

type SerializableRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type TableLayoutProbeResult = {
  cellWidths: Record<string, number>;
  columnStyles: string[];
  failures: string[];
  pass: boolean;
  tableWidth: number;
  textRectCounts: Record<string, number>;
  widthPercents: Record<string, number>;
};

const CONTENT = [
  "## 任务状态表",
  "",
  "| Task | Epic | 状态 | 说明 |",
  "| --- | --- | --- | --- |",
  "| BOOTSTRAP-DOCS | 文档基线 | CLOSED | 文档基线已修正并关闭。 |",
  "| TASK-001 | 项目骨架 | CLOSED | 已通过独立评审；确认 Electron / Vite / React / TypeScript 开发壳可建立。 |",
  "| TASK-002 | 项目结构 | DEV_DONE | 已建立 `apps/desktop`、`packages/editor-core`、`packages/markdown-engine`、`tests/e2e` 目录边界，同时保持根目录开发壳可运行。 |",
  "",
  "after"
].join("\n");

function toSerializableRect(rect: DOMRect): SerializableRect {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function createRangeForText(root: Node, text: string): Range {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const value = current.nodeValue ?? "";
    const index = value.indexOf(text);

    if (index >= 0) {
      const range = document.createRange();
      range.setStart(current, index);
      range.setEnd(current, index + text.length);
      return range;
    }

    current = walker.nextNode();
  }

  throw new Error(`Could not find rendered text ${JSON.stringify(text)}.`);
}

function countVisibleTextRects(root: Node, text: string): number {
  return Array.from(createRangeForText(root, text).getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0
  ).length;
}

function readCellRect(root: ParentNode, row: number, column: number): SerializableRect {
  const editor = root.querySelector<HTMLElement>(`[data-table-cell="${row}:${column}"]`);
  const cell = editor?.closest<HTMLElement>(".cm-table-widget-cell");

  if (!cell) {
    throw new Error(`Could not find table cell ${row}:${column}.`);
  }

  return toSerializableRect(cell.getBoundingClientRect());
}

export async function runTableLayoutProbe(): Promise<TableLayoutProbeResult> {
  document.body.style.margin = "0";
  document.body.style.background = "#fff";
  document.body.style.color = "#1f2937";
  document.body.style.fontFamily = "Georgia, 'Times New Roman', serif";
  document.body.style.fontSize = "16px";

  const root = document.getElementById("probe-root");
  if (!root) {
    throw new Error("Missing probe root.");
  }

  root.innerHTML = "";
  root.setAttribute("class", "document-editor");
  root.setAttribute(
    "style",
    [
      "box-sizing: border-box",
      "width: 970px",
      "margin: 0 auto",
      "padding: 0",
      "--fishmark-document-font-family: Georgia, 'Times New Roman', serif",
      "--fishmark-document-font-size: 16px"
    ].join(";")
  );

  const controller = createCodeEditorController({
    parent: root,
    initialContent: CONTENT,
    onChange: () => undefined
  });

  controller.setSelection(CONTENT.indexOf("after"));
  await nextFrame();

  const table = root.querySelector<HTMLTableElement>(".cm-table-widget-table");
  if (!table) {
    throw new Error("Missing table widget.");
  }

  const tableWidth = table.getBoundingClientRect().width;
  const task = readCellRect(root, 0, 0);
  const epic = readCellRect(root, 0, 1);
  const status = readCellRect(root, 0, 2);
  const note = readCellRect(root, 0, 3);
  const cellWidths = {
    task: task.width,
    epic: epic.width,
    status: status.width,
    note: note.width
  };
  const widthPercents = {
    task: (cellWidths.task / tableWidth) * 100,
    epic: (cellWidths.epic / tableWidth) * 100,
    status: (cellWidths.status / tableWidth) * 100,
    note: (cellWidths.note / tableWidth) * 100
  };
  const textRectCounts = {
    taskHeader: countVisibleTextRects(root, "Task"),
    statusHeader: countVisibleTextRects(root, "状态"),
    bootstrapTask: countVisibleTextRects(root, "BOOTSTRAP-DOCS"),
    closedStatus: countVisibleTextRects(root, "CLOSED")
  };
  const columnStyles = Array.from(root.querySelectorAll<HTMLTableColElement>(".cm-table-widget-column"))
    .map((column) => column.style.width);
  const failures: string[] = [];

  if (widthPercents.task < 19) {
    failures.push(`Task column width ${widthPercents.task.toFixed(2)}% is below 19%.`);
  }
  if (widthPercents.epic < 13) {
    failures.push(`Epic column width ${widthPercents.epic.toFixed(2)}% is below 13%.`);
  }
  if (widthPercents.status < 13) {
    failures.push(`Status column width ${widthPercents.status.toFixed(2)}% is below 13%.`);
  }
  if (widthPercents.note <= 50) {
    failures.push(`Note column width ${widthPercents.note.toFixed(2)}% is not dominant enough.`);
  }

  const maxReadableRectCounts: Record<string, number> = {
    taskHeader: 1,
    statusHeader: 1,
    bootstrapTask: 2,
    closedStatus: 1
  };

  for (const [name, rectCount] of Object.entries(textRectCounts)) {
    const maxReadableRectCount = maxReadableRectCounts[name] ?? 1;

    if (rectCount > maxReadableRectCount) {
      failures.push(
        `${name} rendered into ${rectCount} visual rects; expected at most ${maxReadableRectCount}.`
      );
    }
  }

  controller.destroy();

  return {
    cellWidths,
    columnStyles,
    failures,
    pass: failures.length === 0,
    tableWidth,
    textRectCounts,
    widthPercents
  };
}

Object.assign(window, {
  __runFishmarkTableLayoutProbe: runTableLayoutProbe
});
