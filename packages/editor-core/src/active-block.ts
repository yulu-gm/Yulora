import { parseBlockMap, type BlockMap, type MarkdownBlock } from "../../markdown-engine/src";

export type ActiveBlockSelection = {
  anchor: number;
  head: number;
};

export type ActiveBlockState = {
  blockMap: BlockMap;
  activeBlock: MarkdownBlock | null;
  selection: ActiveBlockSelection;
};

export function createActiveBlockState(
  source: string,
  selection: ActiveBlockSelection
): ActiveBlockState {
  return createActiveBlockStateFromBlockMap(parseBlockMap(source), selection);
}

export function createActiveBlockStateFromBlockMap(
  blockMap: BlockMap,
  selection: ActiveBlockSelection
): ActiveBlockState {
  return {
    blockMap,
    activeBlock: resolveActiveBlock(blockMap, selection.head),
    selection
  };
}

export function resolveActiveBlock(
  blockMap: BlockMap,
  selectionOffset: number
): MarkdownBlock | null {
  for (const block of blockMap.blocks) {
    if (selectionOffset >= block.startOffset && selectionOffset < block.endOffset) {
      return block;
    }
  }

  for (let index = blockMap.blocks.length - 1; index >= 0; index -= 1) {
    const block = blockMap.blocks[index]!;

    if (selectionOffset === block.endOffset) {
      return block;
    }
  }

  return null;
}
