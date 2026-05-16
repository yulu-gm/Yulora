import { useCallback, useEffect, useRef, useState } from "react";

import {
  getDocumentMetrics as getDefaultDocumentMetrics,
  type DocumentMetrics
} from "../document-metrics";
import {
  deriveOutlineItems as deriveDefaultOutlineItems,
  type OutlineItem
} from "../outline";

export const DOCUMENT_DERIVED_DATA_UPDATE_DELAY_MS = 120;

export function useDocumentDerivedDataController(input: {
  deriveOutlineItems?: (content: string) => OutlineItem[];
  getDocumentMetrics?: (content: string) => DocumentMetrics;
} = {}) {
  const deriveOutlineItems = input.deriveOutlineItems ?? deriveDefaultOutlineItems;
  const getDocumentMetrics = input.getDocumentMetrics ?? getDefaultDocumentMetrics;
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
  const [currentDocumentMetrics, setCurrentDocumentMetrics] = useState<DocumentMetrics | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingUpdate = useCallback((): void => {
    if (updateTimerRef.current === null) {
      return;
    }

    clearTimeout(updateTimerRef.current);
    updateTimerRef.current = null;
  }, []);

  const applyDocumentDerivedDataNow = useCallback(
    (content: string | null): void => {
      clearPendingUpdate();
      pendingContentRef.current = null;

      if (content === null) {
        setOutlineItems([]);
        setCurrentDocumentMetrics(null);
        return;
      }

      setOutlineItems(deriveOutlineItems(content));
      setCurrentDocumentMetrics(getDocumentMetrics(content));
    },
    [clearPendingUpdate, deriveOutlineItems, getDocumentMetrics]
  );

  const flushPendingDocumentDerivedData = useCallback((): void => {
    const content = pendingContentRef.current;
    updateTimerRef.current = null;
    pendingContentRef.current = null;

    if (content === null) {
      return;
    }

    setOutlineItems(deriveOutlineItems(content));
    setCurrentDocumentMetrics(getDocumentMetrics(content));
  }, [deriveOutlineItems, getDocumentMetrics]);

  const scheduleDocumentDerivedDataUpdate = useCallback(
    (content: string): void => {
      pendingContentRef.current = content;
      clearPendingUpdate();
      updateTimerRef.current = setTimeout(
        flushPendingDocumentDerivedData,
        DOCUMENT_DERIVED_DATA_UPDATE_DELAY_MS
      );
    },
    [clearPendingUpdate, flushPendingDocumentDerivedData]
  );

  useEffect(() => clearPendingUpdate, [clearPendingUpdate]);

  return {
    outlineItems,
    currentDocumentMetrics,
    applyDocumentDerivedDataNow,
    scheduleDocumentDerivedDataUpdate
  };
}
