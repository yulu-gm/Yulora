import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { parseBlockMap, parseMarkdownDocument } from "@fishmark/markdown-engine";
import type { BlockMap, MarkdownDocument } from "@fishmark/markdown-engine";

import { createFishMarkMarkdownExtensions } from "../extensions";
import { countMarkdownLines } from "./long-document-fixtures";

export type EditorPerformanceOperationName = "insertText" | "selectionMove" | "orderedListEdit";

export type EditorPerformanceOperationResult = {
  durationMs: number;
  name: EditorPerformanceOperationName;
  parseCalls: number;
  parserCalls: EditorPerformanceParserCalls;
};

export type EditorPerformanceProbeReport = {
  fixture: {
    lineCount: number;
    sourceLength: number;
  };
  operations: EditorPerformanceOperationResult[];
};

export type EditorPerformanceParserCalls = {
  blockMap: number;
  markdownDocument: number;
};

type ParseStats = EditorPerformanceParserCalls;

export function measureEditorPerformanceProbe(input: {
  source: string;
}): EditorPerformanceProbeReport {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const parseStats: ParseStats = {
    blockMap: 0,
    markdownDocument: 0
  };
  const parseMarkdownDocumentWithStats = (source: string): MarkdownDocument => {
    parseStats.markdownDocument += 1;
    return parseMarkdownDocument(source);
  };
  const parseBlockMapWithStats = (source: string): BlockMap => {
    parseStats.blockMap += 1;
    return parseBlockMap(source);
  };
  const view = new EditorView({
    state: EditorState.create({
      doc: input.source,
      extensions: createFishMarkMarkdownExtensions({
        parseMarkdownDocument: parseMarkdownDocumentWithStats,
        parseOrderedListNormalizationBlockMap: parseBlockMapWithStats,
        onContentChange: () => {}
      })
    }),
    parent: host
  });

  try {
    const operations: EditorPerformanceOperationResult[] = [
      measureOperation(parseStats, "insertText", () => {
        view.dispatch({
          changes: {
            from: view.state.doc.length,
            insert: "\nPerformance probe insertion."
          }
        });
      }),
      measureOperation(parseStats, "selectionMove", () => {
        view.dispatch({
          selection: {
            anchor: Math.floor(view.state.doc.length / 2)
          }
        });
      }),
      measureOperation(parseStats, "orderedListEdit", () => {
        const source = view.state.doc.toString();
        const orderedItemOffset = source.indexOf("Ordered item");
        const insertionOffset = orderedItemOffset >= 0 ? orderedItemOffset : view.state.doc.length;

        view.dispatch({
          changes: {
            from: insertionOffset,
            insert: "updated "
          },
          selection: {
            anchor: insertionOffset + "updated ".length
          }
        });
      })
    ];

    return {
      fixture: {
        lineCount: countMarkdownLines(input.source),
        sourceLength: input.source.length
      },
      operations
    };
  } finally {
    view.destroy();
    host.remove();
  }
}

export function formatEditorPerformanceProbeReport(report: EditorPerformanceProbeReport): string {
  return [
    "FishMark editor-core performance baseline",
    `fixture.lineCount=${report.fixture.lineCount}`,
    `fixture.sourceLength=${report.fixture.sourceLength}`,
    ...report.operations.map((operation) =>
      [
        `operation=${operation.name}`,
        `durationMs=${formatDuration(operation.durationMs)}`,
        `parseCalls=${operation.parseCalls}`,
        `parserCalls.markdownDocument=${operation.parserCalls.markdownDocument}`,
        `parserCalls.blockMap=${operation.parserCalls.blockMap}`
      ].join(" ")
    )
  ].join("\n");
}

function measureOperation(
  parseStats: ParseStats,
  name: EditorPerformanceOperationName,
  run: () => void
): EditorPerformanceOperationResult {
  const beforeParserCalls = { ...parseStats };
  const startedAt = now();

  run();

  const parserCalls = {
    blockMap: parseStats.blockMap - beforeParserCalls.blockMap,
    markdownDocument: parseStats.markdownDocument - beforeParserCalls.markdownDocument
  };

  return {
    durationMs: now() - startedAt,
    name,
    parseCalls: parserCalls.blockMap + parserCalls.markdownDocument,
    parserCalls
  };
}

function now(): number {
  return typeof globalThis.performance?.now === "function"
    ? globalThis.performance.now()
    : Date.now();
}

function formatDuration(value: number): string {
  return value.toFixed(2);
}
