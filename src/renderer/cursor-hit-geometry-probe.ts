import "./styles/base.css";
import "./styles/primitives.css";
import "./styles/editor-source.css";
import "./styles/markdown-render.css";

import { EditorView } from "@codemirror/view";

import { createCodeEditorController } from "./code-editor";

type SerializableRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type HitSample = {
  actualLine: number | null;
  actualOffset: number | null;
  expectedLine: number;
  expectedOffset: number;
  lineRect: SerializableRect;
  pass: boolean;
  point: { x: number; y: number };
  text: string;
  textRect: SerializableRect;
};

type CursorHitProbeResult = {
  failures: string[];
  pass: boolean;
  samples: HitSample[];
};

const CONTENT = [
  "# Heading",
  "Paragraph before",
  "",
  "> Quote line",
  "> Quote tail",
  "",
  "After quote line",
  "",
  "```ts",
  "const value = 1;",
  "```",
  "",
  "After code line",
  "",
  "+++",
  "",
  "After break line",
  "",
  "| name | qty |",
  "| --- | ---: |",
  "| pen | 2 |",
  "",
  "After table line",
  "Plain tail"
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

function findLineByText(root: ParentNode, text: string): HTMLElement {
  const line = Array.from(root.querySelectorAll<HTMLElement>(".cm-line")).find((entry) =>
    entry.textContent?.includes(text)
  );

  if (!line) {
    throw new Error(`Could not find CodeMirror line containing ${JSON.stringify(text)}.`);
  }

  return line;
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

function firstRangeRect(root: Node, text: string): DOMRect {
  const rect = Array.from(createRangeForText(root, text).getClientRects()).find(
    (entry) => entry.width > 0 && entry.height > 0
  );

  if (!rect) {
    throw new Error(`Could not measure rendered text ${JSON.stringify(text)}.`);
  }

  return rect;
}

function lineNumberAtOffset(source: string, offset: number): number {
  let line = 1;
  const boundedOffset = Math.max(0, Math.min(offset, source.length));

  for (let index = 0; index < boundedOffset; index += 1) {
    if (source[index] === "\n") {
      line += 1;
    }
  }

  return line;
}

function sampleTextHit(root: ParentNode, view: EditorView, text: string): HitSample {
  const textRect = firstRangeRect(root, text);
  const lineElement = findLineByText(root, text);
  const expectedOffset = CONTENT.indexOf(text);
  const expectedLine = lineNumberAtOffset(CONTENT, expectedOffset);
  const point = {
    x: textRect.left + Math.max(1, Math.min(textRect.width / 2, textRect.width - 1)),
    y: textRect.top + textRect.height / 2
  };
  const actualOffset = view.posAtCoords(point);
  const actualLine =
    typeof actualOffset === "number" ? lineNumberAtOffset(CONTENT, actualOffset) : null;

  return {
    actualLine,
    actualOffset,
    expectedLine,
    expectedOffset,
    lineRect: toSerializableRect(lineElement.getBoundingClientRect()),
    pass: actualLine === expectedLine,
    point,
    text,
    textRect: toSerializableRect(textRect)
  };
}

export async function runCursorHitGeometryProbe(): Promise<CursorHitProbeResult> {
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
      "width: 520px",
      "height: 620px",
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

  const editorRoot = root.querySelector<HTMLElement>(".cm-editor");
  if (!editorRoot) {
    throw new Error("Missing CodeMirror editor root.");
  }

  editorRoot.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  controller.setSelection(CONTENT.indexOf("Plain tail"));
  await nextFrame();

  const view = EditorView.findFromDOM(editorRoot);
  if (!view) {
    throw new Error("Could not resolve CodeMirror EditorView.");
  }

  const samples = [
    "Paragraph before",
    "Quote tail",
    "After quote line",
    "value",
    "After code line",
    "After break line",
    "After table line",
    "Plain tail"
  ].map((text) => sampleTextHit(root, view, text));

  controller.destroy();

  const failures = samples
    .filter((sample) => !sample.pass)
    .map(
      (sample) =>
        `${sample.text}: expected line ${sample.expectedLine}, got ${sample.actualLine ?? "null"}`
    );

  return {
    failures,
    pass: failures.length === 0,
    samples
  };
}

Object.assign(window, {
  __runFishmarkCursorHitGeometryProbe: runCursorHitGeometryProbe
});
