import { parse, postprocess, preprocess } from "micromark";
import type { Event, Token } from "micromark-util-types";

import type {
  BlockMap,
  BlockquoteBlock,
  CodeFenceBlock,
  HeadingBlock,
  HtmlImageBlock,
  ListBlock,
  ListItemBlock,
  MarkdownBlock,
  ParagraphBlock,
  ThematicBreakBlock
} from "./block-map";
import { parseHtmlImageData } from "./html-image";

export function parseBlockMap(source: string): BlockMap {
  return {
    blocks: parseTopLevelBlocks(source)
  };
}

export function parseTopLevelBlocks(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let containerDepth = 0;

  for (const [kind, token] of parseEvents(source)) {
    if (kind === "enter") {
      if (token.type === "listOrdered" || token.type === "listUnordered") {
        if (containerDepth === 0) {
          blocks.push(createListBlock(token, token.type === "listOrdered", source));
        }

        containerDepth += 1;
        continue;
      }

      if (token.type === "blockQuote") {
        if (containerDepth === 0) {
          blocks.push(createBlockquoteBlock(token));
        }

        containerDepth += 1;
        continue;
      }

      if (containerDepth > 0) {
        continue;
      }

      if (token.type === "codeFenced") {
        blocks.push(createCodeFenceBlock(token, source));
        continue;
      }

      if (token.type === "htmlFlow") {
        const htmlImageBlock = createHtmlImageBlock(token, source);

        if (htmlImageBlock) {
          blocks.push(htmlImageBlock);
        }

        continue;
      }

      if (token.type === "thematicBreak") {
        blocks.push(createThematicBreakBlock(token, source, "-"));
        continue;
      }

      if (token.type === "atxHeading") {
        blocks.push(createHeadingBlock(token, source));
        continue;
      }

      if (token.type === "setextHeading") {
        blocks.push(...createSetextHeadingDerivedBlocks(token, source));
        continue;
      }

      if (token.type === "paragraph") {
        blocks.push(...createParagraphDerivedBlocks(token, source));
      }

      continue;
    }

    if (token.type === "listOrdered" || token.type === "listUnordered" || token.type === "blockQuote") {
      containerDepth -= 1;
    }
  }

  return blocks;
}

function parseEvents(source: string): Event[] {
  return postprocess(parse().document().write(preprocess()(source, "utf8", true)));
}

function createHeadingBlock(token: Token, source: string): HeadingBlock {
  const base = createBaseBlock("heading", token);

  return {
    ...base,
    depth: getHeadingDepth(token, source)
  };
}

function createParagraphBlock(token: Token): ParagraphBlock {
  return createBlockFromRange("paragraph", token.start.offset, token.end.offset, token.start.line, token.end.line);
}

function createListBlock(token: Token, ordered: boolean, source: string): ListBlock {
  const base = createBaseBlock("list", token);

  return {
    ...base,
    ordered,
    items: parseListItems(source.slice(base.startOffset, base.endOffset), base.startOffset, base.startLine)
  };
}

function createBlockquoteBlock(token: Token): BlockquoteBlock {
  return createBaseBlock("blockquote", token);
}

function createCodeFenceBlock(token: Token, source: string): CodeFenceBlock {
  const base = createBaseBlock("codeFence", token);

  return {
    ...base,
    info: getCodeFenceInfo(source.slice(base.startOffset, base.endOffset))
  };
}

function createThematicBreakBlock(
  token: Token,
  source: string,
  markerOverride?: ThematicBreakBlock["marker"]
): ThematicBreakBlock {
  const base = createBaseBlock("thematicBreak", token);

  return {
    ...base,
    marker: markerOverride ?? getThematicBreakMarker(source.slice(base.startOffset, base.endOffset))
  };
}

function createHtmlImageBlock(token: Token, source: string): HtmlImageBlock | null {
  const htmlImageData = parseHtmlImageData(source.slice(token.start.offset, token.end.offset));

  if (!htmlImageData) {
    return null;
  }

  return {
    ...createBaseBlock("htmlImage", token),
    ...htmlImageData
  };
}

function createBaseBlock<TType extends MarkdownBlock["type"]>(
  type: TType,
  token: Token
): Extract<MarkdownBlock, { type: TType }> {
  return createBlockFromRange(type, token.start.offset, token.end.offset, token.start.line, token.end.line);
}

function createBlockFromRange<TType extends MarkdownBlock["type"]>(
  type: TType,
  startOffset: number,
  endOffset: number,
  startLine: number,
  endLine: number
): Extract<MarkdownBlock, { type: TType }> {
  return {
    id: `${type}:${startOffset}-${endOffset}`,
    type,
    startOffset,
    endOffset,
    startLine,
    endLine
  } as Extract<MarkdownBlock, { type: TType }>;
}

function getHeadingDepth(token: Token, source: string): number {
  const slice = source.slice(token.start.offset, token.end.offset);

  if (token.type === "atxHeading") {
    const match = /^\s{0,3}(#{1,6})(?:[ \t]+|$)/.exec(slice);
    const sequence = match?.[1];

    return sequence ? sequence.length : 1;
  }

  const match = /\n[ \t]{0,3}(=+|-+)[ \t]*$/.exec(slice);
  const sequence = match?.[1];

  if (!sequence) {
    return 1;
  }

  return sequence[0] === "=" ? 1 : 2;
}

function getCodeFenceInfo(sourceSlice: string): string | null {
  const firstLine = sourceSlice.slice(0, sourceSlice.indexOf("\n") === -1 ? sourceSlice.length : sourceSlice.indexOf("\n"));
  const match = /^\s{0,3}(?:`{3,}|~{3,})(?:[ \t]*([^\n]*?))?[ \t]*$/.exec(firstLine);
  const info = match?.[1]?.trim();

  return info ? info : null;
}

function createParagraphDerivedBlocks(
  token: Token,
  source: string
): Array<ParagraphBlock | ThematicBreakBlock> {
  return createDerivedTextBlocks(token, source, () => createParagraphBlock(token), true);
}

function createSetextHeadingDerivedBlocks(
  token: Token,
  source: string
): Array<HeadingBlock | ParagraphBlock | ThematicBreakBlock> {
  return createDerivedTextBlocks(
    token,
    source,
    () => createHeadingBlock(token, source),
    false
  );
}

function createDerivedTextBlocks<TBlock extends ParagraphBlock | HeadingBlock>(
  token: Token,
  source: string,
  createFallbackBlock: () => TBlock,
  splitOnAnyThematicBreak: boolean
): Array<TBlock | ParagraphBlock | ThematicBreakBlock> {
  const lines = createLineInfos(
    source.slice(token.start.offset, token.end.offset),
    token.start.offset,
    token.start.line
  );

  const shouldSplit = splitOnAnyThematicBreak
    ? lines.some((line) => getExplicitThematicBreakMarker(line.text) !== null)
    : lines.some((line) => getExplicitThematicBreakMarker(line.text) === "+") ||
      shouldPreferTrailingDashThematicBreak(lines);

  if (!shouldSplit) {
    return [createFallbackBlock()];
  }

  const blocks: Array<ParagraphBlock | ThematicBreakBlock> = [];
  let paragraphStart: LineInfo | null = null;
  let paragraphEnd: LineInfo | null = null;

  const flushParagraph = () => {
    if (!paragraphStart || !paragraphEnd) {
      return;
    }

    blocks.push(
      createBlockFromRange(
        "paragraph",
        paragraphStart.startOffset,
        paragraphEnd.endOffset,
        paragraphStart.lineNumber,
        paragraphEnd.lineNumber
      )
    );
    paragraphStart = null;
    paragraphEnd = null;
  };

  for (const line of lines) {
    const marker = getExplicitThematicBreakMarker(line.text);

    if (marker) {
      flushParagraph();
      blocks.push({
        ...createBlockFromRange(
          "thematicBreak",
          line.startOffset,
          line.endOffset,
          line.lineNumber,
          line.lineNumber
        ),
        marker
      });
      continue;
    }

    if (!paragraphStart) {
      paragraphStart = line;
    }

    paragraphEnd = line;
  }

  flushParagraph();

  return blocks as Array<TBlock | ParagraphBlock | ThematicBreakBlock>;
}

function shouldPreferTrailingDashThematicBreak(lines: LineInfo[]): boolean {
  if (lines.length <= 2) {
    return false;
  }

  return getExplicitThematicBreakMarker(lines.at(-1)?.text ?? "") === "-";
}

function getExplicitThematicBreakMarker(sourceSlice: string): ThematicBreakBlock["marker"] | null {
  if (/^\s{0,3}\+(?:[ \t]*\+){2,}[ \t]*$/.test(sourceSlice)) {
    return "+";
  }

  if (/^\s{0,3}-(?:[ \t]*-){2,}[ \t]*$/.test(sourceSlice)) {
    return "-";
  }

  return null;
}

function getThematicBreakMarker(sourceSlice: string): ThematicBreakBlock["marker"] {
  const firstMarker = /[+-]/.exec(sourceSlice)?.[0];

  return firstMarker === "+" ? "+" : "-";
}

type LineInfo = {
  text: string;
  startOffset: number;
  endOffset: number;
  lineNumber: number;
};

type DraftListItem = {
  startOffset: number;
  startLine: number;
  indent: number;
  marker: string;
  markerStart: number;
  markerEnd: number;
  task: ListItemBlock["task"];
  endOffset: number;
  endLine: number;
};

const LIST_ITEM_PATTERN = /^(\s*)([*+-]|\d+[.)])(?:[ \t]+|$)/;
const TASK_MARKER_PATTERN = /^\[( |x|X)\](?=[ \t]|$)/;

function parseListItems(sourceSlice: string, baseOffset: number, baseLine: number): ListItemBlock[] {
  const lines = createLineInfos(sourceSlice, baseOffset, baseLine);
  const items: DraftListItem[] = [];

  for (const line of lines) {
    const match = LIST_ITEM_PATTERN.exec(line.text);
    if (!match) {
      const current = items.at(-1);
      if (current) {
        current.endOffset = line.endOffset;
        current.endLine = line.lineNumber;
      }
      continue;
    }

    const indent = match[1]?.length ?? 0;
    const marker = match[2] ?? "-";
    const markerStart = line.startOffset + indent;
    const markerEnd = markerStart + marker.length;
    const remainder = line.text.slice(match[0].length);
    const task = parseTaskMarker(remainder, markerEnd + (match[0].length - indent - marker.length));

    items.push({
      startOffset: line.startOffset,
      startLine: line.lineNumber,
      indent,
      marker,
      markerStart,
      markerEnd,
      task,
      endOffset: line.endOffset,
      endLine: line.lineNumber
    });
  }

  return items.map((item) => ({
    id: `list-item:${item.startOffset}-${item.endOffset}`,
    startOffset: item.startOffset,
    endOffset: item.endOffset,
    startLine: item.startLine,
    endLine: item.endLine,
    indent: item.indent,
    marker: item.marker,
    markerStart: item.markerStart,
    markerEnd: item.markerEnd,
    task: item.task
  }));
}

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

function parseTaskMarker(remainder: string, taskStartOffset: number): ListItemBlock["task"] {
  const taskMatch = TASK_MARKER_PATTERN.exec(remainder);
  if (!taskMatch) {
    return null;
  }

  return {
    checked: taskMatch[1]?.toLowerCase() === "x",
    markerStart: taskStartOffset,
    markerEnd: taskStartOffset + taskMatch[0].length
  };
}
