import type {
  OpenMarkdownDocument,
  OpenMarkdownFileResult
} from "../shared/open-markdown-file";

export type OpenState = "idle" | "opening";

export type AppState = {
  currentDocument: OpenMarkdownDocument | null;
  openState: OpenState;
  errorMessage: string | null;
};

export function createInitialAppState(): AppState {
  return {
    currentDocument: null,
    openState: "idle",
    errorMessage: null
  };
}

export function startOpeningMarkdownFile(currentState: AppState): AppState {
  return {
    ...currentState,
    openState: "opening"
  };
}

export function applyOpenMarkdownResult(
  currentState: AppState,
  result: OpenMarkdownFileResult
): AppState {
  if (result.status === "success") {
    return {
      currentDocument: result.document,
      openState: "idle",
      errorMessage: null
    };
  }

  if (result.status === "cancelled") {
    return {
      ...currentState,
      openState: "idle",
      errorMessage: null
    };
  }

  return {
    ...currentState,
    openState: "idle",
    errorMessage: result.error.message
  };
}

export function updateCurrentDocumentContent(currentState: AppState, nextContent: string): AppState {
  if (!currentState.currentDocument) {
    return currentState;
  }

  return {
    ...currentState,
    currentDocument: {
      ...currentState.currentDocument,
      content: nextContent
    }
  };
}
