import type { SaveMarkdownFileResult } from "../shared/save-markdown-file";
import type { WorkspaceWindowSnapshot } from "../shared/workspace";
import type { WorkspaceTabSessionSnapshot } from "./workspace-service";

type SavedWorkspaceDocument = Extract<SaveMarkdownFileResult, { status: "success" }>["document"];

type WorkspaceApplicationDependencies = {
  workspace: {
    getWindowSnapshot: (windowId: string) => WorkspaceWindowSnapshot;
    getTabSession: (tabId: string) => WorkspaceTabSessionSnapshot;
    updateTabDraft: (tabId: string, content: string) => WorkspaceWindowSnapshot;
    saveTabDocument: (tabId: string, document: SavedWorkspaceDocument) => WorkspaceWindowSnapshot;
  };
  saveMarkdownFileToPath: (input: {
    tabId: string;
    path: string;
    content: string;
  }) => Promise<SaveMarkdownFileResult>;
};

export function createWorkspaceApplication(dependencies: WorkspaceApplicationDependencies) {
  return {
    updateDraft(input: { tabId: string; content: string }): WorkspaceWindowSnapshot {
      return dependencies.workspace.updateTabDraft(input.tabId, input.content);
    },
    async saveTab(input: { tabId: string; path: string }): Promise<SaveMarkdownFileResult> {
      const tab = dependencies.workspace.getTabSession(input.tabId);
      const result = await dependencies.saveMarkdownFileToPath({
        tabId: input.tabId,
        path: input.path,
        content: tab.content
      });

      if (result.status === "success") {
        dependencies.workspace.saveTabDocument(input.tabId, result.document);
      }

      return result;
    }
  };
}
