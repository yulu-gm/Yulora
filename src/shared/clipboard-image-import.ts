export const IMPORT_CLIPBOARD_IMAGE_CHANNEL = "fishmark:import-clipboard-image";

export type ImportClipboardImageInput = {
  documentPath: string;
};

export type ImportClipboardImageResult =
  | {
      status: "success";
      markdown: string;
      relativePath: string;
    }
  | {
      status: "error";
      error: {
        code:
          | "document-path-required"
          | "no-image"
          | "image-too-large"
          | "write-failed";
        message: string;
      };
    };
