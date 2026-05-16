// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { createLongMarkdownFixture } from "./long-document-fixtures";
import {
  formatEditorPerformanceProbeReport,
  measureEditorPerformanceProbe
} from "./editor-performance-probe";

describe("measureEditorPerformanceProbe", () => {
  it("records parse counts and durations for insert, selection move, and ordered-list edit", () => {
    const fixture = createLongMarkdownFixture({
      kind: "mixed-blocks",
      lineCount: 5000
    });
    const report = measureEditorPerformanceProbe({
      source: fixture.source
    });

    expect(report.fixture).toEqual({
      lineCount: 5000,
      sourceLength: fixture.source.length
    });
    expect(report.operations.map((operation) => operation.name)).toEqual([
      "insertText",
      "selectionMove",
      "orderedListEdit"
    ]);
    expect(report.operations.every((operation) => operation.durationMs >= 0)).toBe(true);
    expect(report.operations.every((operation) => Number.isInteger(operation.parseCalls))).toBe(true);
    expect(report.operations.some((operation) => operation.parseCalls > 0)).toBe(true);
    expect(report.operations.find((operation) => operation.name === "orderedListEdit")?.parserCalls.blockMap).toBeGreaterThan(0);
    expect(formatEditorPerformanceProbeReport(report)).toContain("parseCalls");

    if (shouldPrintPerformanceReport()) {
      console.info(formatEditorPerformanceProbeReport(report));
    }
  }, 15_000);
});

function shouldPrintPerformanceReport(): boolean {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env?.FISHMARK_PERF_REPORT === "1";
}
