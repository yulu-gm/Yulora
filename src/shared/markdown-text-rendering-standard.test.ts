import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type LengthValue = {
  value: number;
};

type ListStandard = {
  geometry: {
    indentStepRem: number;
    indentStepEm: number;
    depthOffsetFormula: string;
    contentStartFormula: string;
    wrappedLineFormula: string;
    rawSourcePrefixRule: string;
  };
  markerToTextGapRem: LengthValue & {
    unit: string;
    mustBeEqualAcross: string[];
  };
  unordered: {
    markerGlyphSizeRem: number;
    markerGlyphSizeEm: number;
    markerGlyphLeftFromDepthRem: number;
    markerGlyphLeftFromDepthEm: number;
    contentStartOffsetRem: number;
    contentStartOffsetEm: number;
  };
  ordered: {
    markerColumnWidthRem: number;
    markerColumnWidthEm: number;
    contentStartOffsetRem: number;
    contentStartOffsetEm: number;
  };
  task: {
    checkboxSizeRem: number;
    checkboxSizeEm: number;
    checkboxLeftFromDepthRem: number;
    checkboxLeftFromDepthEm: number;
    contentStartOffsetRem: number;
    contentStartOffsetEm: number;
  };
};

type MarkdownTextRenderingStandard = {
  schemaVersion: number;
  status: string;
  units: {
    listGeometryLength: string;
    alignmentPxTolerance: number;
    gapPxTolerance: number;
  };
  typography: {
    base: {
      letterSpacing: LengthValue;
    };
    lineHeight: {
      paragraph: number;
      list: number;
      listContinuation: number;
    };
  };
  lists: ListStandard;
  themeCompliance: {
    themesMustNotOverride: string[];
  };
  acceptance: {
    requiredAutomatedChecks: string[];
    passFailRules: string[];
  };
};

const standardPath = join(process.cwd(), "docs/standards/markdown-text-rendering-standard.json");

function readStandard(): MarkdownTextRenderingStandard {
  return JSON.parse(readFileSync(standardPath, "utf-8")) as MarkdownTextRenderingStandard;
}

describe("markdown text rendering standard", () => {
  it("defines a canonical JSON source for Markdown text geometry", () => {
    const standard = readStandard();

    expect(standard.schemaVersion).toBe(1);
    expect(standard.status).toBe("canonical");
    expect(standard.units.listGeometryLength).toBe("em");
    expect(standard.units.alignmentPxTolerance).toBe(2);
    expect(standard.units.gapPxTolerance).toBe(1);
    expect(standard.typography.base.letterSpacing.value).toBe(0);
    expect(standard.typography.lineHeight.paragraph).toBeGreaterThan(standard.typography.lineHeight.list);
    expect(standard.typography.lineHeight.listContinuation).toBe(standard.typography.lineHeight.list);
  });

  it("keeps list depth, marker gap, and content offsets as separate constraints", () => {
    const { lists } = readStandard();
    const gap = lists.markerToTextGapRem.value;

    expect(lists.geometry.indentStepRem).toBe(1.4);
    expect(lists.geometry.indentStepEm).toBe(1.4);
    expect(gap).toBe(0.62);
    expect(lists.markerToTextGapRem.unit).toBe("em");
    expect(lists.ordered.markerColumnWidthRem).toBe(2.4);
    expect(lists.ordered.markerColumnWidthEm).toBe(2.4);
    expect(lists.geometry.depthOffsetFormula).toBe("depth * indentStepRem");
    expect(lists.geometry.contentStartFormula).toContain("markerToTextGapRem");
    expect(lists.geometry.wrappedLineFormula).toContain("firstContentGlyphLeft");
    expect(lists.geometry.rawSourcePrefixRule).toContain("must not double-count the depth offset");
    expect(lists.markerToTextGapRem.mustBeEqualAcross).toContain("child unordered item");
    expect(lists.unordered.contentStartOffsetEm).toBeCloseTo(
      lists.unordered.markerGlyphLeftFromDepthEm + lists.unordered.markerGlyphSizeEm + gap
    );
    expect(lists.ordered.contentStartOffsetEm).toBeCloseTo(lists.ordered.markerColumnWidthEm + gap);
    expect(lists.task.contentStartOffsetEm).toBeCloseTo(
      lists.task.checkboxLeftFromDepthEm + lists.task.checkboxSizeEm + gap
    );
  });

  it("makes theme geometry overrides and geometry-free approvals invalid", () => {
    const standard = readStandard();

    expect(standard.themeCompliance.themesMustNotOverride).toContain("list marker-to-text gap");
    expect(standard.themeCompliance.themesMustNotOverride).toContain("negative letter spacing");
    expect(standard.acceptance.requiredAutomatedChecks).toContain(
      "DOM geometry tests measure list marker-to-text gap at depth 0 and depth 1."
    );
    expect(standard.acceptance.passFailRules).toContain(
      "Any parent/child list marker-to-text gap difference above 1px is FAIL."
    );
  });
});
