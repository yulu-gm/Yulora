// @vitest-environment jsdom

import { act, createElement, createRef, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkspaceWindowSnapshot } from "../../shared/workspace";
import { useWorkspaceController } from "./useWorkspaceController";

type WorkspaceControllerValue = ReturnType<typeof useWorkspaceController>;

function createWorkspaceSnapshot(input: {
  activeTabId?: string | null;
  tabs: Array<{
    tabId: string;
    path: string | null;
    name: string;
    content: string;
    isDirty?: boolean;
  }>;
}): WorkspaceWindowSnapshot {
  const activeTabId = input.activeTabId ?? input.tabs[0]?.tabId ?? null;
  const activeDocument =
    activeTabId === null ? null : input.tabs.find((tab) => tab.tabId === activeTabId) ?? null;

  return {
    windowId: "window-1",
    activeTabId,
    tabs: input.tabs.map((tab) => ({
      tabId: tab.tabId,
      path: tab.path,
      name: tab.name,
      isDirty: tab.isDirty ?? false,
      saveState: "idle"
    })),
    activeDocument: activeDocument
      ? {
          tabId: activeDocument.tabId,
          path: activeDocument.path,
          name: activeDocument.name,
          content: activeDocument.content,
          encoding: "utf-8",
          isDirty: activeDocument.isDirty ?? false,
          saveState: "idle"
        }
      : null
  };
}

function renderController(input: Parameters<typeof useWorkspaceController>[0]): {
  latestRef: { current: WorkspaceControllerValue | null };
  root: Root;
  container: HTMLDivElement;
} {
  const latestRef = createRef<WorkspaceControllerValue>();
  const container = document.createElement("div");
  const root = createRoot(container);

  function Probe(): null {
    const controller = useWorkspaceController(input);

    useEffect(() => {
      latestRef.current = controller;
    }, [controller]);

    return null;
  }

  act(() => {
    root.render(createElement(Probe));
  });

  return { latestRef, root, container };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useWorkspaceController", () => {
  it("updates the active editor by syncing the draft through the canonical workspace bridge", async () => {
    const updateWorkspaceTabDraft = vi.fn(async () =>
      createWorkspaceSnapshot({
        tabs: [
          {
            tabId: "tab-1",
            path: "C:/notes/note.md",
            name: "note.md",
            content: "# Updated\n",
            isDirty: true
          }
        ]
      })
    );

    const { latestRef, root } = renderController({
      fishmark: {
        updateWorkspaceTabDraft
      } as unknown as Window["fishmark"],
      initialSnapshot: createWorkspaceSnapshot({
        tabs: [
          {
            tabId: "tab-1",
            path: "C:/notes/note.md",
            name: "note.md",
            content: "# Note\n"
          }
        ]
      }),
      getEditorContent: () => "# Updated\n",
      showNotification: vi.fn()
    });

    await act(async () => {
      await latestRef.current?.updateDraft("# Updated\n");
    });

    expect(updateWorkspaceTabDraft).toHaveBeenCalledWith({
      tabId: "tab-1",
      content: "# Updated\n"
    });
    expect(latestRef.current?.workspaceSnapshot?.activeDocument?.content).toBe("# Updated\n");

    act(() => {
      root.unmount();
    });
  });

  it("flushes the active draft before switching tabs", async () => {
    const updateWorkspaceTabDraft = vi.fn(async () =>
      createWorkspaceSnapshot({
        activeTabId: "tab-1",
        tabs: [
          {
            tabId: "tab-1",
            path: "C:/notes/first.md",
            name: "first.md",
            content: "# First updated\n",
            isDirty: true
          },
          {
            tabId: "tab-2",
            path: "C:/notes/second.md",
            name: "second.md",
            content: "# Second\n"
          }
        ]
      })
    );
    const activateWorkspaceTab = vi.fn(async () =>
      createWorkspaceSnapshot({
        activeTabId: "tab-2",
        tabs: [
          {
            tabId: "tab-1",
            path: "C:/notes/first.md",
            name: "first.md",
            content: "# First updated\n",
            isDirty: true
          },
          {
            tabId: "tab-2",
            path: "C:/notes/second.md",
            name: "second.md",
            content: "# Second\n"
          }
        ]
      })
    );

    const { latestRef, root } = renderController({
      fishmark: {
        updateWorkspaceTabDraft,
        activateWorkspaceTab
      } as unknown as Window["fishmark"],
      initialSnapshot: createWorkspaceSnapshot({
        activeTabId: "tab-1",
        tabs: [
          {
            tabId: "tab-1",
            path: "C:/notes/first.md",
            name: "first.md",
            content: "# First\n"
          },
          {
            tabId: "tab-2",
            path: "C:/notes/second.md",
            name: "second.md",
            content: "# Second\n"
          }
        ]
      }),
      getEditorContent: () => "# First updated\n",
      showNotification: vi.fn()
    });

    await act(async () => {
      await latestRef.current?.activateWorkspaceTab("tab-2");
    });

    expect(updateWorkspaceTabDraft).toHaveBeenCalledWith({
      tabId: "tab-1",
      content: "# First updated\n"
    });
    expect(activateWorkspaceTab).toHaveBeenCalledWith({ tabId: "tab-2" });
    expect(updateWorkspaceTabDraft.mock.invocationCallOrder[0]).toBeLessThan(
      activateWorkspaceTab.mock.invocationCallOrder[0]!
    );
    expect(latestRef.current?.workspaceSnapshot?.activeTabId).toBe("tab-2");

    act(() => {
      root.unmount();
    });
  });
});
