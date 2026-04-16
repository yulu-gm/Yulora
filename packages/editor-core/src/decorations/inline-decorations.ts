import { Decoration } from "@codemirror/view";
import { type Range } from "@codemirror/state";

import type { InlineASTNode, InlineRoot } from "@yulora/markdown-engine";

const INACTIVE_INLINE_MARKER_CLASS = "cm-inactive-inline-marker";
const INACTIVE_INLINE_CONTENT_CLASSES = {
  strong: "cm-inactive-inline-strong",
  emphasis: "cm-inactive-inline-emphasis",
  codeSpan: "cm-inactive-inline-code",
  strikethrough: "cm-inactive-inline-strikethrough"
} as const;

type InlineDecorationRange = Range<Decoration>;

export function createInactiveInlineDecorations(inline: InlineRoot | undefined): InlineDecorationRange[] {
  const ranges: InlineDecorationRange[] = [];

  if (!inline) {
    return ranges;
  }

  appendInlineDecorations(inline, ranges);
  return ranges;
}

function appendInlineDecorations(node: InlineASTNode, ranges: InlineDecorationRange[]) {
  switch (node.type) {
    case "root":
      for (const child of node.children) {
        appendInlineDecorations(child, ranges);
      }
      return;
    case "text":
      return;
    case "codeSpan":
      appendMarkerDecoration(ranges, node.openMarker.startOffset, node.openMarker.endOffset);
      appendContentDecoration(
        ranges,
        node.openMarker.endOffset,
        node.closeMarker.startOffset,
        INACTIVE_INLINE_CONTENT_CLASSES.codeSpan
      );
      appendMarkerDecoration(ranges, node.closeMarker.startOffset, node.closeMarker.endOffset);
      return;
    case "strong":
    case "emphasis":
    case "strikethrough":
      appendMarkerDecoration(ranges, node.openMarker.startOffset, node.openMarker.endOffset);
      appendContentDecoration(
        ranges,
        node.openMarker.endOffset,
        node.closeMarker.startOffset,
        INACTIVE_INLINE_CONTENT_CLASSES[node.type]
      );
      for (const child of node.children) {
        appendInlineDecorations(child, ranges);
      }
      appendMarkerDecoration(ranges, node.closeMarker.startOffset, node.closeMarker.endOffset);
      return;
    case "link":
    case "image":
      appendMarkerDecoration(ranges, node.openMarker.startOffset, node.openMarker.endOffset);
      for (const child of node.children) {
        appendInlineDecorations(child, ranges);
      }
      appendMarkerDecoration(ranges, node.closeMarker.startOffset, node.closeMarker.endOffset);
      return;
  }
}

function appendMarkerDecoration(
  ranges: InlineDecorationRange[],
  startOffset: number,
  endOffset: number
) {
  if (endOffset <= startOffset) {
    return;
  }

  ranges.push(
    Decoration.mark({
      attributes: {
        class: INACTIVE_INLINE_MARKER_CLASS
      }
    }).range(startOffset, endOffset)
  );
}

function appendContentDecoration(
  ranges: InlineDecorationRange[],
  startOffset: number,
  endOffset: number,
  className: string
) {
  if (endOffset <= startOffset) {
    return;
  }

  ranges.push(
    Decoration.mark({
      attributes: {
        class: className
      }
    }).range(startOffset, endOffset)
  );
}
