import { parse, postprocess, preprocess } from "micromark";

import type {
  BlockquoteBlock,
  HeadingBlock,
  InlineLine,
  ListBlock,
  ListItemBlock,
  MarkdownBlock
} from "./block-map";
import { parseBlockquoteLinePrefix } from "./blockquote";
import type { InlineReferenceDefinition } from "./inline-ast";
import type { MarkdownDocument } from "./markdown-document";
import { parseBlockMap } from "./parse-block-map";
import { normalizeReferenceIdentifier, parseInlineAst } from "./parse-inline-ast";

export function parseMarkdownDocument(source: string): MarkdownDocument {
  const referenceDefinitions = collectReferenceDefinitions(source);
  return {
    blocks: parseBlockMap(source).blocks.map((block) => attachInlineData(block, source, referenceDefinitions))
  };
}

export function collectReferenceDefinitions(source: string): Map<string, InlineReferenceDefinition> {
  const definitions = new Map<string, InlineReferenceDefinition>();
  let current: {
    destinationEndOffset: number | null;
    destinationStartOffset: number | null;
    href: string | null;
    label: string | null;
    title: string | null;
    titleEndOffset: number | null;
    titleStartOffset: number | null;
  } | null = null;

  for (const [phase, token] of postprocess(parse().document().write(preprocess()(source, "utf8", true)))) {
    const tokenType = token.type as string;

    if (phase === "enter") {
      if (tokenType === "definition") {
        current = {
          destinationEndOffset: null,
          destinationStartOffset: null,
          href: null,
          label: null,
          title: null,
          titleEndOffset: null,
          titleStartOffset: null
        };
        continue;
      }

      if (!current) {
        continue;
      }

      if (tokenType === "definitionLabelString") {
        current.label = normalizeReferenceIdentifier(source.slice(token.start.offset, token.end.offset));
        continue;
      }

      if (tokenType === "definitionDestinationString") {
        current.href = source.slice(token.start.offset, token.end.offset);
        current.destinationStartOffset = token.start.offset;
        current.destinationEndOffset = token.end.offset;
        continue;
      }

      if (tokenType === "definitionTitleString") {
        current.title = source.slice(token.start.offset, token.end.offset);
        current.titleStartOffset = token.start.offset;
        current.titleEndOffset = token.end.offset;
      }

      continue;
    }

    if (tokenType !== "definition" || !current) {
      continue;
    }

    if (
      current.label &&
      current.href !== null &&
      current.destinationStartOffset !== null &&
      current.destinationEndOffset !== null &&
      !definitions.has(current.label)
    ) {
      definitions.set(current.label, {
        href: current.href,
        title: current.title,
        destinationStartOffset: current.destinationStartOffset,
        destinationEndOffset: current.destinationEndOffset,
        titleStartOffset: current.titleStartOffset,
        titleEndOffset: current.titleEndOffset
      });
    }

    current = null;
  }

  return definitions;
}

function attachInlineData(
  block: MarkdownBlock,
  source: string,
  referenceDefinitions: ReadonlyMap<string, InlineReferenceDefinition>
): MarkdownBlock {
  if (block.type === "heading") {
    const contentRange = getHeadingContentRange(block, source);
    return {
      ...block,
      markerEnd: contentRange.markerEnd,
      inline: parseInlineAst(source, contentRange.contentStartOffset, contentRange.contentEndOffset, {
        referenceDefinitions
      })
    };
  }

  if (block.type === "paragraph") {
    const contentEndOffset = trimTrailingCarriageReturn(source, block.startOffset, block.endOffset);
    return {
      ...block,
      inline: parseInlineAst(source, block.startOffset, contentEndOffset, { referenceDefinitions })
    };
  }

  if (block.type === "list") {
    return enrichListBlock(block, source, referenceDefinitions);
  }

  if (block.type === "blockquote") {
    return {
      ...block,
      lines: createBlockquoteLines(block, source, referenceDefinitions)
    };
  }

  if (block.type === "table") {
    return block;
  }

  return block;
}

function enrichListBlock(
  block: ListBlock,
  source: string,
  referenceDefinitions: ReadonlyMap<string, InlineReferenceDefinition>
): ListBlock {
  return {
    ...block,
    items: block.items.map((item) => enrichListItem(item, source, referenceDefinitions))
  };
}

type HeadingContentRange = {
  markerEnd: number;
  contentStartOffset: number;
  contentEndOffset: number;
};

function getHeadingContentRange(heading: HeadingBlock, source: string): HeadingContentRange {
  const lineEndOffset = findLineEndOffset(source, heading.startOffset, heading.endOffset);
  const contentLineEndOffset = trimTrailingCarriageReturn(source, heading.startOffset, lineEndOffset);
  const lineText = source.slice(heading.startOffset, contentLineEndOffset);
  const atxMatch = /^([ \t]{0,3})(#{1,6})(?:([ \t]+)|$)/.exec(lineText);

  if (!atxMatch) {
    return {
      markerEnd: heading.startOffset,
      contentStartOffset: heading.startOffset,
      contentEndOffset: contentLineEndOffset
    };
  }

  const markerEnd = heading.startOffset + atxMatch[0].length;
  let contentEndOffset = contentLineEndOffset;
  const remainder = source.slice(markerEnd, contentLineEndOffset);
  const closingMatch = /(?:[ \t]+#+[ \t]*)$/.exec(remainder);

  if (closingMatch) {
    contentEndOffset = contentLineEndOffset - closingMatch[0].length;
  }

  return {
    markerEnd,
    contentStartOffset: markerEnd,
    contentEndOffset: Math.max(markerEnd, contentEndOffset)
  };
}

function enrichListItem(
  item: ListItemBlock,
  source: string,
  referenceDefinitions: ReadonlyMap<string, InlineReferenceDefinition>
): ListItemBlock {
  const contentRange = getListItemContentRange(item, source);
  return {
    ...item,
    contentStartOffset: contentRange.contentStartOffset,
    contentEndOffset: contentRange.contentEndOffset,
    inline: parseInlineAst(source, contentRange.contentStartOffset, contentRange.contentEndOffset, {
      referenceDefinitions
    }),
    children: item.children.map((child) => enrichListBlock(child, source, referenceDefinitions))
  };
}

type ListItemContentRange = {
  contentStartOffset: number;
  contentEndOffset: number;
};

function getListItemContentRange(item: ListItemBlock, source: string): ListItemContentRange {
  const firstChildStartOffset = item.children[0]?.startOffset ?? item.endOffset;
  const contentUpperBound = Math.min(firstChildStartOffset, item.endOffset);
  const firstLineEndOffset = findLineEndOffset(source, item.startOffset, contentUpperBound);
  const firstLineContentEndOffset = trimTrailingCarriageReturn(source, item.startOffset, firstLineEndOffset);

  let contentStartOffset = item.markerEnd;
  contentStartOffset = consumeHorizontalSpace(source, contentStartOffset, firstLineContentEndOffset);

  if (item.task && item.task.markerStart === contentStartOffset) {
    contentStartOffset = item.task.markerEnd;
    contentStartOffset = consumeHorizontalSpace(source, contentStartOffset, firstLineContentEndOffset);
  }

  const boundedContentStartOffset = Math.min(contentStartOffset, contentUpperBound);
  const contentEndOffset = trimTrailingListItemContent(source, boundedContentStartOffset, contentUpperBound);

  return {
    contentStartOffset: boundedContentStartOffset,
    contentEndOffset
  };
}

function trimTrailingListItemContent(source: string, startOffset: number, endOffset: number): number {
  let cursor = trimTrailingCarriageReturn(source, startOffset, endOffset);

  while (cursor > startOffset) {
    const character = source[cursor - 1];

    if (character !== " " && character !== "\t" && character !== "\r" && character !== "\n") {
      break;
    }

    cursor -= 1;
  }

  return cursor;
}

function createBlockquoteLines(
  blockquote: BlockquoteBlock,
  source: string,
  referenceDefinitions: ReadonlyMap<string, InlineReferenceDefinition>
): InlineLine[] {
  const lines = createLineInfos(
    source.slice(blockquote.startOffset, blockquote.endOffset),
    blockquote.startOffset,
    blockquote.startLine
  );

  return lines.map((line) => {
    const contentLineEndOffset = trimTrailingCarriageReturn(source, line.startOffset, line.endOffset);
    const prefix = parseBlockquoteLinePrefix(source, line.startOffset, contentLineEndOffset);
    return {
      text: source.slice(line.startOffset, contentLineEndOffset),
      startOffset: line.startOffset,
      endOffset: line.endOffset,
      lineNumber: line.lineNumber,
      quoteDepth: prefix.markers.length,
      markers: prefix.markers,
      markerEnd: prefix.markerEnd,
      sourcePrefixEndOffset: prefix.sourcePrefixEndOffset,
      contentStartOffset: prefix.contentStartOffset,
      contentEndOffset: contentLineEndOffset,
      inline: parseInlineAst(source, prefix.contentStartOffset, contentLineEndOffset, { referenceDefinitions })
    };
  });
}

function consumeHorizontalSpace(source: string, offset: number, endOffset: number): number {
  let cursor = offset;
  while (cursor < endOffset) {
    const character = source[cursor];
    if (character !== " " && character !== "\t") {
      break;
    }
    cursor += 1;
  }
  return cursor;
}

function findLineEndOffset(source: string, lineStartOffset: number, upperBound: number): number {
  const lineBreakOffset = source.indexOf("\n", lineStartOffset);
  if (lineBreakOffset === -1 || lineBreakOffset > upperBound) {
    return upperBound;
  }
  return lineBreakOffset;
}

function trimTrailingCarriageReturn(source: string, startOffset: number, endOffset: number): number {
  if (endOffset > startOffset && source[endOffset - 1] === "\r") {
    return endOffset - 1;
  }
  return endOffset;
}

type LineInfo = {
  text: string;
  startOffset: number;
  endOffset: number;
  lineNumber: number;
};

function createLineInfos(sourceSlice: string, baseOffset: number, baseLine: number): LineInfo[] {
  if (sourceSlice.length === 0) {
    return [];
  }

  const lines: LineInfo[] = [];
  let cursor = 0;
  let lineNumber = baseLine;

  while (cursor < sourceSlice.length) {
    const lineEndIndex = sourceSlice.indexOf("\n", cursor);
    const endIndex = lineEndIndex === -1 ? sourceSlice.length : lineEndIndex;

    lines.push({
      text: sourceSlice.slice(cursor, endIndex),
      startOffset: baseOffset + cursor,
      endOffset: baseOffset + endIndex,
      lineNumber
    });

    if (lineEndIndex === -1) {
      break;
    }

    cursor = lineEndIndex + 1;
    lineNumber += 1;
  }

  return lines;
}
