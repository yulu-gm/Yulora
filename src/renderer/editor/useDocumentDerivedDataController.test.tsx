// @vitest-environment jsdom

import { act, createElement, createRef, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DOCUMENT_DERIVED_DATA_UPDATE_DELAY_MS,
  useDocumentDerivedDataController
} from "./useDocumentDerivedDataController";

type ControllerValue = ReturnType<typeof useDocumentDerivedDataController>;

function renderController(
  options: Parameters<typeof useDocumentDerivedDataController>[0]
): {
  latestRef: { current: ControllerValue | null };
  root: Root;
} {
  const latestRef = createRef<ControllerValue>();
  const root = createRoot(document.createElement("div"));

  function Probe(): null {
    const controller = useDocumentDerivedDataController(options);

    useEffect(() => {
      latestRef.current = controller;
    }, [controller]);

    return null;
  }

  act(() => {
    root.render(createElement(Probe));
  });

  return { latestRef, root };
}

describe("useDocumentDerivedDataController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies opened-document derived data immediately", () => {
    const deriveOutlineItems = vi.fn(() => [
      {
        id: "heading:0-7",
        label: "Title",
        depth: 1,
        startOffset: 0,
        startLine: 1
      }
    ]);
    const getDocumentMetrics = vi.fn(() => ({
      meaningfulCharacterCount: 5
    }));
    const { latestRef, root } = renderController({
      deriveOutlineItems,
      getDocumentMetrics
    });

    act(() => {
      latestRef.current?.applyDocumentDerivedDataNow("# Title");
    });

    expect(deriveOutlineItems).toHaveBeenCalledWith("# Title");
    expect(getDocumentMetrics).toHaveBeenCalledWith("# Title");
    expect(latestRef.current?.outlineItems).toHaveLength(1);
    expect(latestRef.current?.currentDocumentMetrics?.meaningfulCharacterCount).toBe(5);

    act(() => {
      root.unmount();
    });
  });

  it("defers editor-change derived data work and only applies the latest content", () => {
    const deriveOutlineItems = vi.fn((content: string) => [
      {
        id: `heading:${content.length}`,
        label: content,
        depth: 1,
        startOffset: 0,
        startLine: 1
      }
    ]);
    const getDocumentMetrics = vi.fn((content: string) => ({
      meaningfulCharacterCount: content.length
    }));
    const { latestRef, root } = renderController({
      deriveOutlineItems,
      getDocumentMetrics
    });

    act(() => {
      latestRef.current?.scheduleDocumentDerivedDataUpdate("# First");
      latestRef.current?.scheduleDocumentDerivedDataUpdate("# Second");
    });

    expect(deriveOutlineItems).not.toHaveBeenCalled();
    expect(getDocumentMetrics).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DOCUMENT_DERIVED_DATA_UPDATE_DELAY_MS - 1);
    });

    expect(deriveOutlineItems).not.toHaveBeenCalled();
    expect(getDocumentMetrics).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(deriveOutlineItems).toHaveBeenCalledTimes(1);
    expect(deriveOutlineItems).toHaveBeenCalledWith("# Second");
    expect(getDocumentMetrics).toHaveBeenCalledTimes(1);
    expect(getDocumentMetrics).toHaveBeenCalledWith("# Second");
    expect(latestRef.current?.outlineItems[0]?.label).toBe("# Second");
    expect(latestRef.current?.currentDocumentMetrics?.meaningfulCharacterCount).toBe("# Second".length);

    act(() => {
      root.unmount();
    });
  });
});
