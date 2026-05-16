import type { BlockMap } from "./block-map";
import type { InlineReferenceDefinition } from "./inline-ast";

export interface MarkdownDocument {
  blocks: BlockMap["blocks"];
  referenceDefinitions?: ReadonlyMap<string, InlineReferenceDefinition>;
}

export type { BlockMap };
