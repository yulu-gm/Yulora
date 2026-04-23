import { describe, expect, it } from "vitest";

import { createWorkspaceApplication } from "./workspace-application";
import { createWorkspaceService } from "./workspace-service";

describe("createWorkspaceApplication", () => {
  it("saves the canonical draft even when the renderer payload is stale", async () => {
    const workspace = createWorkspaceService();
    workspace.registerWindow("window-1");
    const snapshot = workspace.createUntitledTab("window-1");
    const tabId = snapshot.activeTabId!;

    workspace.updateTabDraft(tabId, "# Canonical\n");

    const writes: string[] = [];
    const application = createWorkspaceApplication({
      workspace,
      saveMarkdownFileToPath: async ({ content, path }) => {
        writes.push(`${path}:${content}`);
        return {
          status: "success",
          document: { path, name: "note.md", content, encoding: "utf-8" }
        };
      }
    });

    await application.saveTab({
      tabId,
      path: "C:/notes/note.md"
    });

    expect(writes).toEqual(["C:/notes/note.md:# Canonical\n"]);
  });
});
