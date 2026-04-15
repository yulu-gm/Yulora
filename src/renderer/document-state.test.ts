import { describe, expect, it } from "vitest";

import {
  applyOpenMarkdownResult,
  createInitialAppState,
  updateCurrentDocumentContent,
  type AppState
} from "./document-state";

describe("applyOpenMarkdownResult", () => {
  it("loads the returned document and clears the previous error", () => {
    const nextState = applyOpenMarkdownResult(createInitialAppState(), {
      status: "success",
      document: {
        path: "C:/notes/today.md",
        name: "today.md",
        content: "# Today\n",
        encoding: "utf-8"
      }
    });

    expect(nextState.currentDocument?.name).toBe("today.md");
    expect(nextState.currentDocument?.content).toBe("# Today\n");
    expect(nextState.errorMessage).toBeNull();
    expect(nextState.openState).toBe("idle");
  });

  it("keeps the current document on cancelled results", () => {
    const initialState: AppState = {
      currentDocument: {
        path: "C:/notes/existing.md",
        name: "existing.md",
        content: "draft",
        encoding: "utf-8"
      },
      openState: "opening",
      errorMessage: "old error"
    };

    const nextState = applyOpenMarkdownResult(initialState, { status: "cancelled" });

    expect(nextState.currentDocument?.name).toBe("existing.md");
    expect(nextState.errorMessage).toBeNull();
    expect(nextState.openState).toBe("idle");
  });

  it("stores the error message when opening fails", () => {
    const nextState = applyOpenMarkdownResult(createInitialAppState(), {
      status: "error",
      error: {
        code: "read-failed",
        message: "The Markdown file could not be read."
      }
    });

    expect(nextState.currentDocument).toBeNull();
    expect(nextState.errorMessage).toBe("The Markdown file could not be read.");
    expect(nextState.openState).toBe("idle");
  });
});

describe("updateCurrentDocumentContent", () => {
  it("updates the in-memory content for the opened document", () => {
    const state: AppState = {
      currentDocument: {
        path: "C:/notes/today.md",
        name: "today.md",
        content: "# Today\n",
        encoding: "utf-8"
      },
      openState: "idle",
      errorMessage: null
    };

    const nextState = updateCurrentDocumentContent(state, "# Updated\n");

    expect(nextState.currentDocument?.content).toBe("# Updated\n");
  });
});
