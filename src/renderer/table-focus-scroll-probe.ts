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

type TableFocusScrollSample = {
  bodyScrollTop: number;
  cell: string | null;
  documentScrollTop: number;
  editorRect: SerializableRect | null;
  pageScrollY: number;
  pass: boolean;
  scrollerRect: SerializableRect;
  scrollTop: number;
};

type TableFocusScrollProbeResult = {
  failures: string[];
  pass: boolean;
  samples: TableFocusScrollSample[];
};

const TABLE_ROWS = Array.from({ length: 48 }, (_, index) => {
  const row = index + 1;
  return `| item-${String(row).padStart(2, "0")} | ${row} | note ${row} |`;
});

const CONTENT = [
  "# Table focus scroll probe",
  "",
  ...Array.from({ length: 16 }, (_, index) => `Paragraph before ${index + 1}`),
  "",
  "| name | qty | note |",
  "| --- | ---: | --- |",
  ...TABLE_ROWS,
  "",
  ...Array.from({ length: 16 }, (_, index) => `Paragraph after ${index + 1}`)
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

function getTableCell(root: ParentNode, row: number, column: number): HTMLElement {
  const cell = root.querySelector<HTMLElement>(`[data-table-cell="${row}:${column}"]`);

  if (!cell) {
    throw new Error(`Could not find table cell ${row}:${column}.`);
  }

  return cell;
}

function sampleActiveCell(root: ParentNode, scroller: HTMLElement): TableFocusScrollSample {
  const editor =
    root.querySelector<HTMLElement>(".cm-table-widget-input:focus") ??
    root.querySelector<HTMLElement>('.cm-table-widget-cell[data-active="true"] .cm-table-widget-input');
  const scrollerRect = scroller.getBoundingClientRect();
  const editorRect = editor?.getBoundingClientRect() ?? null;
  const pageScrollY = window.scrollY;
  const documentScrollTop = document.documentElement.scrollTop;
  const bodyScrollTop = document.body.scrollTop;
  const pass =
    !!editorRect &&
    editorRect.top >= scrollerRect.top - 1 &&
    editorRect.bottom <= scrollerRect.bottom + 1 &&
    pageScrollY === 0 &&
    documentScrollTop === 0 &&
    bodyScrollTop === 0;

  return {
    bodyScrollTop,
    cell: editor?.dataset.tableCell ?? null,
    documentScrollTop,
    editorRect: editorRect ? toSerializableRect(editorRect) : null,
    pageScrollY,
    pass,
    scrollerRect: toSerializableRect(scrollerRect),
    scrollTop: scroller.scrollTop
  };
}

function scrollCellToMiddle(scroller: HTMLElement, cell: HTMLElement): void {
  const scrollerRect = scroller.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  scroller.scrollTop += cellRect.top - scrollerRect.top - scrollerRect.height / 2 + cellRect.height / 2;
}

export async function runTableFocusScrollProbe(content?: string | null): Promise<TableFocusScrollProbeResult> {
  document.body.style.margin = "0";
  document.body.style.background = "#fff";
  document.body.style.color = "#1f2937";
  document.body.style.fontFamily = "Georgia, 'Times New Roman', serif";
  document.body.style.fontSize = "16px";
  document.documentElement.style.overflow = content ? "auto" : "hidden";
  document.body.style.overflow = content ? "auto" : "hidden";

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
      "width: 720px",
      "height: 420px",
      "margin: 0 auto",
      "padding: 0",
      "--fishmark-document-font-family: Georgia, 'Times New Roman', serif",
      "--fishmark-document-font-size: 16px"
    ].join(";")
  );

  const controller = createCodeEditorController({
    parent: root,
    initialContent: content ?? CONTENT,
    onChange: () => undefined
  });

  const scroller = root.querySelector<HTMLElement>(".cm-scroller");
  if (!scroller) {
    throw new Error("Missing CodeMirror scroller.");
  }

  const startCell = content ? getTableCell(root, 1, 0) : getTableCell(root, 30, 0);
  scrollCellToMiddle(scroller, startCell);
  await nextFrame();

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  await nextFrame();

  startCell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  startCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await nextFrame();

  const samples: TableFocusScrollSample[] = [sampleActiveCell(root, scroller)];

  const stepCount = content ? 3 : 8;

  for (let index = 0; index < stepCount; index += 1) {
    const active =
      root.querySelector<HTMLElement>(".cm-table-widget-input:focus") ??
      root.querySelector<HTMLElement>('.cm-table-widget-cell[data-active="true"] .cm-table-widget-input');
    if (!active) {
      throw new Error("Missing active table cell during navigation.");
    }

    active.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        code: "ArrowDown",
        bubbles: true,
        cancelable: true
      })
    );
    await nextFrame();
    samples.push(sampleActiveCell(root, scroller));
  }

  controller.destroy();

  const failures = samples
    .filter((sample) => !sample.pass)
    .map(
      (sample) =>
        `${sample.cell ?? "no-cell"} is outside the editor scroller viewport or scrolled the page ` +
        `(window=${sample.pageScrollY}, document=${sample.documentScrollTop}, body=${sample.bodyScrollTop})`
    );

  return {
    failures,
    pass: failures.length === 0,
    samples
  };
}

Object.assign(window, {
  __runFishmarkTableFocusScrollProbe: runTableFocusScrollProbe
});
