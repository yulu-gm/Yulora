import { describe, expect, it } from "vitest";

import { getDocumentMetrics } from "./document-metrics";

describe("getDocumentMetrics", () => {
  it("returns 0 for an empty document", () => {
    expect(getDocumentMetrics("").meaningfulCharacterCount).toBe(0);
  });

  it("counts non-whitespace characters for English text", () => {
    expect(getDocumentMetrics("hello world").meaningfulCharacterCount).toBe(10);
  });

  it("returns stable meaningful character count for Chinese text", () => {
    expect(getDocumentMetrics("你好，世界！").meaningfulCharacterCount).toBe(6);
  });

  it("does not count leading/trailing whitespace and empty lines as meaningful characters", () => {
    expect(getDocumentMetrics("\n\n  你好 世界  \n\n").meaningfulCharacterCount).toBe(4);
  });
});
