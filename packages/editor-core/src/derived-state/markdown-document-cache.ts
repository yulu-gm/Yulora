import type { MarkdownDocument } from "@yulora/markdown-engine";

export type ParseMarkdownDocument = (source: string) => MarkdownDocument;

export type MarkdownDocumentCache = {
  read: (source: string) => MarkdownDocument;
  clear: () => void;
};

export function createMarkdownDocumentCache(
  parseMarkdownDocument: ParseMarkdownDocument
): MarkdownDocumentCache {
  let cachedSource: string | null = null;
  let cachedDocument: MarkdownDocument | null = null;

  return {
    read(source) {
      if (cachedDocument && cachedSource === source) {
        return cachedDocument;
      }

      cachedSource = source;
      cachedDocument = parseMarkdownDocument(source);

      return cachedDocument;
    },
    clear() {
      cachedSource = null;
      cachedDocument = null;
    }
  };
}
