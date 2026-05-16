import { describe, expect, it } from "vitest";

import { createLongMarkdownFixture } from "../../../packages/editor-core/src/performance/long-document-fixtures";
import {
  formatRendererDerivedDataPerformanceReport,
  measureRendererDerivedDataPerformance
} from "./document-derived-ui";

describe("measureRendererDerivedDataPerformance", () => {
  it("records outline and document metrics timings for a long Markdown document", () => {
    const fixture = createLongMarkdownFixture({
      kind: "mixed-blocks",
      lineCount: 5000
    });
    const report = measureRendererDerivedDataPerformance(fixture.source);

    expect(report.lineCount).toBe(5000);
    expect(report.sourceLength).toBe(fixture.source.length);
    expect(report.outline.itemCount).toBeGreaterThan(0);
    expect(report.outline.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.metrics.meaningfulCharacterCount).toBeGreaterThan(0);
    expect(report.metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(formatRendererDerivedDataPerformanceReport(report)).toContain("meaningfulCharacterCount");

    if (shouldPrintPerformanceReport()) {
      console.info(formatRendererDerivedDataPerformanceReport(report));
    }
  }, 15_000);
});

function shouldPrintPerformanceReport(): boolean {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env?.FISHMARK_PERF_REPORT === "1";
}
