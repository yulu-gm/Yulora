import { describe, expect, it, vi } from "vitest";

import { exportHtmlFileToPath, showExportHtmlDialog } from "./export-html-file";

describe("exportHtmlFileToPath", () => {
  it("writes UTF-8 HTML to the target path and returns exported metadata", async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);

    const result = await exportHtmlFileToPath(
      {
        tabId: "tab-1",
        path: "C:/notes/today.html",
        html: "<!doctype html><title>today</title>"
      },
      { writeFile }
    );

    expect(writeFile).toHaveBeenCalledWith(
      "C:/notes/today.html",
      "<!doctype html><title>today</title>",
      "utf8"
    );
    expect(result).toEqual({
      status: "success",
      path: "C:/notes/today.html",
      name: "today.html"
    });
  });

  it("returns write-failed when the exported HTML cannot be saved", async () => {
    const result = await exportHtmlFileToPath(
      {
        tabId: "tab-1",
        path: "C:/notes/today.html",
        html: "<!doctype html>"
      },
      {
        writeFile: vi.fn().mockRejectedValue(new Error("permission denied"))
      }
    );

    expect(result).toEqual({
      status: "error",
      error: {
        code: "write-failed",
        message: "The HTML file could not be exported."
      }
    });
  });
});

describe("showExportHtmlDialog", () => {
  it("suggests an HTML file next to the current Markdown document", async () => {
    const showSaveDialog = vi.fn().mockResolvedValue({
      canceled: true,
      filePath: undefined
    });

    const result = await showExportHtmlDialog(
      {
        tabId: "tab-1",
        currentPath: "C:/notes/today.md",
        html: "<!doctype html>"
      },
      {
        exportHtmlFileToPath: vi.fn(),
        showSaveDialog
      }
    );

    expect(result).toEqual({ status: "cancelled" });
    expect(showSaveDialog).toHaveBeenCalledWith({
      title: "Export HTML",
      defaultPath: "C:/notes/today.html",
      filters: [{ name: "HTML", extensions: ["html", "htm"] }]
    });
  });

  it("supports untitled documents by using a stable default file name", async () => {
    const showSaveDialog = vi.fn().mockResolvedValue({
      canceled: true,
      filePath: undefined
    });

    await showExportHtmlDialog(
      {
        tabId: "tab-1",
        currentPath: null,
        html: "<!doctype html>"
      },
      {
        exportHtmlFileToPath: vi.fn(),
        showSaveDialog
      }
    );

    expect(showSaveDialog).toHaveBeenCalledWith({
      title: "Export HTML",
      defaultPath: "untitled.html",
      filters: [{ name: "HTML", extensions: ["html", "htm"] }]
    });
  });

  it("writes the selected path and returns exported metadata", async () => {
    const result = await showExportHtmlDialog(
      {
        tabId: "tab-1",
        currentPath: "C:/notes/today.md",
        html: "<!doctype html>"
      },
      {
        exportHtmlFileToPath: vi.fn().mockResolvedValue({
          status: "success",
          path: "C:/archive/today.html",
          name: "today.html"
        }),
        showSaveDialog: vi.fn().mockResolvedValue({
          canceled: false,
          filePath: "C:/archive/today.html"
        })
      }
    );

    expect(result).toEqual({
      status: "success",
      path: "C:/archive/today.html",
      name: "today.html"
    });
  });
});
