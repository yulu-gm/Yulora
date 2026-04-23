import { useCallback, useEffect, useMemo, useState } from "react";

import type { AppNotification } from "../../shared/app-update";
import type { WorkspaceDocumentSnapshot } from "../../shared/workspace";
import {
  applyExternalMarkdownFileChanged,
  clearExternalMarkdownFileState,
  keepExternalMarkdownMemoryVersion,
  type ExternalMarkdownFileState
} from "./editor-shell-state";

export function useExternalConflictController(input: {
  fishmark: Window["fishmark"];
  getActiveDocument: () => WorkspaceDocumentSnapshot | null;
  reloadActiveDocument: () => Promise<boolean>;
  resetAutosaveRuntime: () => void;
  showNotification: (notification: AppNotification) => void;
}) {
  const { fishmark, getActiveDocument, reloadActiveDocument, resetAutosaveRuntime, showNotification } =
    input;
  const [storedExternalFileState, setExternalFileState] = useState<ExternalMarkdownFileState>({
    status: "idle"
  });
  const activeDocumentPath = getActiveDocument()?.path ?? null;
  const externalFileState = useMemo<ExternalMarkdownFileState>(() => {
    if (storedExternalFileState.status === "idle") {
      return storedExternalFileState;
    }

    return storedExternalFileState.path === activeDocumentPath
      ? storedExternalFileState
      : clearExternalMarkdownFileState();
  }, [activeDocumentPath, storedExternalFileState]);

  const handleExternalMarkdownFileChanged = useCallback(
    (event: { path: string; kind: "modified" | "deleted" }): void => {
      setExternalFileState((current) =>
        applyExternalMarkdownFileChanged(current, getActiveDocument(), event)
      );
      resetAutosaveRuntime();
    },
    [getActiveDocument, resetAutosaveRuntime]
  );

  const keepMemoryVersion = useCallback((): void => {
    resetAutosaveRuntime();
    setExternalFileState((current) => keepExternalMarkdownMemoryVersion(current));
  }, [resetAutosaveRuntime]);

  const dismissConflict = useCallback((): void => {
    setExternalFileState(clearExternalMarkdownFileState());
  }, []);

  const reloadFromDisk = useCallback(async (): Promise<void> => {
    try {
      const didReload = await reloadActiveDocument();
      if (didReload) {
        setExternalFileState(clearExternalMarkdownFileState());
      }
    } catch (error) {
      showNotification({
        kind: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }, [reloadActiveDocument, showNotification]);

  useEffect(() => {
    return fishmark.onExternalMarkdownFileChanged((event) => {
      handleExternalMarkdownFileChanged(event);
    });
  }, [fishmark, handleExternalMarkdownFileChanged]);

  const hasExternalFileConflict = useCallback(() => externalFileState.status !== "idle", [
    externalFileState.status
  ]);

  return {
    externalFileState,
    handleExternalMarkdownFileChanged,
    keepMemoryVersion,
    dismissConflict,
    reloadFromDisk,
    hasExternalFileConflict
  };
}
