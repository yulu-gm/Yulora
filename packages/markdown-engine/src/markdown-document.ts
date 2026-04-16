import type { BlockMap } from "./block-map";

export interface MarkdownDocument {
  blocks: BlockMap["blocks"];
}

export type { BlockMap };
