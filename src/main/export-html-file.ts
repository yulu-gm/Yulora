import path from "node:path";
import { writeFile } from "node:fs/promises";
import { dialog } from "electron";

import {
  EXPORT_HTML_FILE_ERROR_MESSAGES,
  type ExportHtmlFileErrorCode,
  type ExportHtmlFileInput,
  type ExportHtmlFileResult
} from "../shared/export-html-file";

export type ExportHtmlFileDependencies = {
  writeFile: (
    targetPath: string,
    content: string,
    encoding: BufferEncoding
  ) => Promise<void>;
};

type SaveDialogResult = {
  canceled: boolean;
  filePath?: string;
};

type SaveDialogOptions = {
  defaultPath: string;
  filters: Array<{
    extensions: string[];
    name: string;
  }>;
  title: string;
};

export type ExportHtmlDialogDependencies = {
  exportHtmlFileToPath: typeof exportHtmlFileToPath;
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
};

type ExportHtmlFileToPathInput = {
  tabId: string;
  path: string;
  html: string;
};

const defaultDependencies: ExportHtmlFileDependencies = {
  writeFile
};

export async function exportHtmlFileToPath(
  input: ExportHtmlFileToPathInput,
  dependencies: ExportHtmlFileDependencies = defaultDependencies
): Promise<ExportHtmlFileResult> {
  try {
    await dependencies.writeFile(input.path, input.html, "utf8");

    return {
      status: "success",
      path: input.path,
      name: path.basename(input.path)
    };
  } catch {
    return createErrorResult("write-failed");
  }
}

export async function showExportHtmlDialog(
  input: ExportHtmlFileInput,
  dependencies: ExportHtmlDialogDependencies = {
    exportHtmlFileToPath,
    showSaveDialog: (options) => dialog.showSaveDialog(options)
  }
): Promise<ExportHtmlFileResult> {
  try {
    const dialogResult = await dependencies.showSaveDialog({
      title: "Export HTML",
      defaultPath: resolveDefaultExportPath(input.currentPath),
      filters: [{ name: "HTML", extensions: ["html", "htm"] }]
    });

    if (dialogResult.canceled) {
      return { status: "cancelled" };
    }

    if (!dialogResult.filePath) {
      return createErrorResult("dialog-failed");
    }

    return dependencies.exportHtmlFileToPath({
      tabId: input.tabId,
      path: dialogResult.filePath,
      html: input.html
    });
  } catch {
    return createErrorResult("dialog-failed");
  }
}

function resolveDefaultExportPath(currentPath: string | null): string {
  if (!currentPath) {
    return "untitled.html";
  }

  const parsedPath = path.parse(currentPath);
  if (!parsedPath.ext) {
    return `${currentPath}.html`;
  }

  return `${currentPath.slice(0, -parsedPath.ext.length)}.html`;
}

function createErrorResult(code: ExportHtmlFileErrorCode): ExportHtmlFileResult {
  return {
    status: "error",
    error: {
      code,
      message: EXPORT_HTML_FILE_ERROR_MESSAGES[code]
    }
  };
}
