import { beforeEach, describe, expect, it, vi } from "vitest";

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();
const on = vi.fn();
const off = vi.fn();

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld
  },
  ipcRenderer: {
    invoke,
    on,
    off
  }
}));

async function loadApi(): Promise<{ api: Window["fishmark"]; testApi: Window["fishmarkTest"] }> {
  await import("./preload");

  expect(exposeInMainWorld).toHaveBeenCalledTimes(2);
  const [, api] = exposeInMainWorld.mock.calls[0] ?? [];
  const [testBridgeName, testBridgeApi] = exposeInMainWorld.mock.calls[1] ?? [];

  expect(testBridgeName).toBe("fishmarkTest");
  return {
    api: api as Window["fishmark"],
    testApi: testBridgeApi as Window["fishmarkTest"]
  };
}

describe("preload bridge", () => {
  beforeEach(() => {
    exposeInMainWorld.mockClear();
    invoke.mockClear();
    on.mockClear();
    off.mockClear();
    vi.resetModules();
  });

  it("exposes task-030 scenario run controls for the workbench", async () => {
    await import("./preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(2);
    const [, api] = exposeInMainWorld.mock.calls[1] ?? [];

    expect(api).toMatchObject({
      startScenarioRun: expect.any(Function),
      interruptScenarioRun: expect.any(Function),
      onScenarioRunEvent: expect.any(Function),
      onScenarioRunTerminal: expect.any(Function)
    });
  });

  it("keeps test bridge APIs off the product bridge and exposes the split bridge globally", async () => {
    const { api, testApi } = await loadApi();

    expect(api).not.toHaveProperty("startScenarioRun");
    expect(api).not.toHaveProperty("onEditorTestCommand");
    expect(testApi).toMatchObject({
      openEditorTestWindow: expect.any(Function),
      startScenarioRun: expect.any(Function),
      interruptScenarioRun: expect.any(Function),
      onScenarioRunEvent: expect.any(Function),
      onScenarioRunTerminal: expect.any(Function),
      onEditorTestCommand: expect.any(Function),
      completeEditorTestCommand: expect.any(Function)
    });
  });

  it("wires theme package discovery and refresh IPC channels", async () => {
    const { api } = await loadApi();

    expect(api).not.toHaveProperty("listThemes");
    expect(api).not.toHaveProperty("refreshThemes");
    void api.listThemePackages();
    void api.refreshThemePackages();

    expect(invoke.mock.calls).toContainEqual(["fishmark:list-theme-packages"]);
    expect(invoke.mock.calls).toContainEqual(["fishmark:refresh-theme-packages"]);
    expect(invoke.mock.calls).not.toContainEqual(["fishmark:list-themes"]);
    expect(invoke.mock.calls).not.toContainEqual(["fishmark:refresh-themes"]);
  });

  it("exposes workspace bridge methods for Task-043 tab commands", async () => {
    const { api } = await loadApi();

    expect(api).toMatchObject({
      getWorkspaceSnapshot: expect.any(Function),
      createWorkspaceTab: expect.any(Function),
      openWorkspaceFile: expect.any(Function),
      openWorkspaceFileFromPath: expect.any(Function),
      activateWorkspaceTab: expect.any(Function),
      closeWorkspaceTab: expect.any(Function),
      reorderWorkspaceTab: expect.any(Function),
      moveWorkspaceTabToWindow: expect.any(Function),
      detachWorkspaceTabToNewWindow: expect.any(Function),
      onOpenWorkspacePath: expect.any(Function),
      updateWorkspaceTabDraft: expect.any(Function)
    });

    void api.getWorkspaceSnapshot();
    void api.createWorkspaceTab({ kind: "untitled" });
    void api.openWorkspaceFile();
    void api.openWorkspaceFileFromPath("D:/fixtures/tabbed.md");
    void api.activateWorkspaceTab({ tabId: "tab-1" });
    void api.closeWorkspaceTab({ tabId: "tab-1" });
    void api.reorderWorkspaceTab({ tabId: "tab-1", toIndex: 0 });
    void api.moveWorkspaceTabToWindow({ tabId: "tab-1", targetWindowId: "window-2" });
    void api.detachWorkspaceTabToNewWindow({ tabId: "tab-1" });
    void api.onOpenWorkspacePath(() => {});
    void api.updateWorkspaceTabDraft({ tabId: "tab-1", content: "# Updated\n" });

    expect(invoke.mock.calls).toContainEqual(["fishmark:get-workspace-snapshot"]);
    expect(invoke.mock.calls).toContainEqual(["fishmark:create-workspace-tab", { kind: "untitled" }]);
    expect(invoke.mock.calls).toContainEqual(["fishmark:open-workspace-file"]);
    expect(invoke.mock.calls).toContainEqual([
      "fishmark:open-workspace-file-from-path",
      { targetPath: "D:/fixtures/tabbed.md" }
    ]);
    expect(invoke.mock.calls).toContainEqual(["fishmark:activate-workspace-tab", { tabId: "tab-1" }]);
    expect(invoke.mock.calls).toContainEqual(["fishmark:close-workspace-tab", { tabId: "tab-1" }]);
    expect(invoke.mock.calls).toContainEqual([
      "fishmark:reorder-workspace-tab",
      { tabId: "tab-1", toIndex: 0 }
    ]);
    expect(invoke.mock.calls).toContainEqual([
      "fishmark:move-workspace-tab-to-window",
      { tabId: "tab-1", targetWindowId: "window-2" }
    ]);
    expect(invoke.mock.calls).toContainEqual([
      "fishmark:detach-workspace-tab-to-new-window",
      { tabId: "tab-1" }
    ]);
    expect(invoke.mock.calls).toContainEqual([
      "fishmark:update-workspace-tab-draft",
      { tabId: "tab-1", content: "# Updated\n" }
    ]);
  });

  it("exposes an openThemesDirectory bridge for the native themes folder action", async () => {
    const { api } = await loadApi();

    expect(api).toHaveProperty("openThemesDirectory");
    void api.openThemesDirectory();

    expect(invoke.mock.calls).toContainEqual(["fishmark:open-themes-directory"]);
  });
});
