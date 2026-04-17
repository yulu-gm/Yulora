import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import type {
  ImportClipboardImageInput,
  ImportClipboardImageResult
} from "../shared/clipboard-image-import";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type SupportedClipboardFormat = {
  mimeType: "image/png" | "image/jpeg" | "image/jpg" | "image/webp" | "image/gif";
  extension: "png" | "jpg" | "webp" | "gif";
};

type ClipboardImageDependencies = {
  clipboard: {
    availableFormats: () => string[];
    readBuffer: (format: string) => Buffer;
  };
  mkdir?: typeof mkdir;
  writeFile?: typeof writeFile;
  now?: () => Date;
};

const SUPPORTED_FORMATS: SupportedClipboardFormat[] = [
  { mimeType: "image/png", extension: "png" },
  { mimeType: "image/jpeg", extension: "jpg" },
  { mimeType: "image/jpg", extension: "jpg" },
  { mimeType: "image/webp", extension: "webp" },
  { mimeType: "image/gif", extension: "gif" }
];

export async function importClipboardImage(
  input: ImportClipboardImageInput,
  dependencies: ClipboardImageDependencies
): Promise<ImportClipboardImageResult> {
  if (!input.documentPath) {
    return {
      status: "error",
      error: {
        code: "document-path-required",
        message: "Save the Markdown document before pasting images."
      }
    };
  }

  const selectedFormat = selectSupportedFormat(dependencies.clipboard.availableFormats());

  if (!selectedFormat) {
    return {
      status: "error",
      error: {
        code: "no-image",
        message: "Clipboard does not contain a supported image."
      }
    };
  }

  const imageBuffer = dependencies.clipboard.readBuffer(selectedFormat.mimeType);

  if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
    return {
      status: "error",
      error: {
        code: "image-too-large",
        message: "Clipboard image is too large to import."
      }
    };
  }

  const createDirectory = dependencies.mkdir ?? mkdir;
  const writeImageFile = dependencies.writeFile ?? writeFile;
  const timestamp = formatTimestamp((dependencies.now ?? (() => new Date()))());
  const parsedDocumentPath = path.parse(input.documentPath);
  const documentBaseName = sanitizeBaseName(parsedDocumentPath.name || "image");
  const assetsDirectory = normalizePathForFs(path.join(parsedDocumentPath.dir, "assets"));

  await createDirectory(assetsDirectory, { recursive: true });

  let attempt = 1;

  while (true) {
    const candidateName = buildCandidateName({
      baseName: documentBaseName,
      extension: selectedFormat.extension,
      timestamp,
      attempt
    });
    const assetPath = normalizePathForFs(path.join(assetsDirectory, candidateName));

    try {
      await writeImageFile(assetPath, imageBuffer, { flag: "wx" });

      const relativePath = path.relative(parsedDocumentPath.dir, assetPath).replace(/\\/g, "/");

      return {
        status: "success",
        markdown: `![${documentBaseName}](${relativePath})`,
        relativePath
      };
    } catch (error) {
      if (isNodeErrorWithCode(error, "EEXIST")) {
        attempt += 1;
        continue;
      }

      return {
        status: "error",
        error: {
          code: "write-failed",
          message: "The clipboard image could not be imported."
        }
      };
    }
  }
}

function selectSupportedFormat(availableFormats: string[]): SupportedClipboardFormat | null {
  const normalizedFormats = new Set(availableFormats.map((entry) => entry.toLowerCase()));

  for (const format of SUPPORTED_FORMATS) {
    if (normalizedFormats.has(format.mimeType)) {
      return format;
    }
  }

  return null;
}

function buildCandidateName(input: {
  baseName: string;
  timestamp: string;
  extension: string;
  attempt: number;
}): string {
  const suffix = input.attempt === 1 ? "" : `-${input.attempt}`;
  return `${input.baseName}-image-${input.timestamp}${suffix}.${input.extension}`;
}

function sanitizeBaseName(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "image";
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate())
  ].join("") + `-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function normalizePathForFs(targetPath: string): string {
  return targetPath.replace(/\\/g, "/");
}

function isNodeErrorWithCode(error: unknown, expectedCode: string): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string" &&
    (error as NodeJS.ErrnoException).code === expectedCode
  );
}
