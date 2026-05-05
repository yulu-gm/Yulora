export type ExportHtmlFileErrorCode = "dialog-failed" | "write-failed";

export type ExportHtmlFileInput = {
  tabId: string;
  currentPath: string | null;
  html: string;
};

export type ExportHtmlFileResult =
  | {
      status: "success";
      path: string;
      name: string;
    }
  | {
      status: "cancelled";
    }
  | {
      status: "error";
      error: {
        code: ExportHtmlFileErrorCode;
        message: string;
      };
    };

export const EXPORT_HTML_FILE_CHANNEL = "fishmark:export-html-file";

export const EXPORT_HTML_FILE_ERROR_MESSAGES: Record<ExportHtmlFileErrorCode, string> = {
  "dialog-failed": "The export dialog could not be opened.",
  "write-failed": "The HTML file could not be exported."
};
