import { countMarkdownLines } from "../../../packages/editor-core/src/performance/long-document-fixtures";
import { getDocumentMetrics } from "../document-metrics";
import { deriveOutlineItems } from "../outline";

export type RendererDerivedDataPerformanceReport = {
  lineCount: number;
  metrics: {
    durationMs: number;
    meaningfulCharacterCount: number;
  };
  outline: {
    durationMs: number;
    itemCount: number;
  };
  sourceLength: number;
};

export function measureRendererDerivedDataPerformance(source: string): RendererDerivedDataPerformanceReport {
  const outline = measure(() => deriveOutlineItems(source));
  const metrics = measure(() => getDocumentMetrics(source));

  return {
    lineCount: countMarkdownLines(source),
    metrics: {
      durationMs: metrics.durationMs,
      meaningfulCharacterCount: metrics.value.meaningfulCharacterCount
    },
    outline: {
      durationMs: outline.durationMs,
      itemCount: outline.value.length
    },
    sourceLength: source.length
  };
}

export function formatRendererDerivedDataPerformanceReport(
  report: RendererDerivedDataPerformanceReport
): string {
  return [
    "FishMark renderer derived-data performance baseline",
    `lineCount=${report.lineCount}`,
    `sourceLength=${report.sourceLength}`,
    `outline.itemCount=${report.outline.itemCount}`,
    `outline.durationMs=${formatDuration(report.outline.durationMs)}`,
    `metrics.meaningfulCharacterCount=${report.metrics.meaningfulCharacterCount}`,
    `metrics.durationMs=${formatDuration(report.metrics.durationMs)}`
  ].join("\n");
}

function measure<T>(run: () => T): { durationMs: number; value: T } {
  const startedAt = now();
  const value = run();

  return {
    durationMs: now() - startedAt,
    value
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
