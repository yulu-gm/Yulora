import type { BlockMap } from "@fishmark/markdown-engine";
import { createMarkdownDocumentCache } from "./markdown-document-cache";

export type ParseBlockMap = (source: string) => BlockMap;

export type BlockMapCache = {
  read: (source: string) => BlockMap;
  clear: () => void;
};

export function createBlockMapCache(parseBlockMap: ParseBlockMap): BlockMapCache {
  const documentCache = createMarkdownDocumentCache(parseBlockMap);

  return {
    read(source) {
      return documentCache.read(source);
    },
    clear() {
      documentCache.clear();
    }
  };
}
