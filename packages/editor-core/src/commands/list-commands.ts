import type { EditorView } from "@codemirror/view";
import type { ListItemBlock } from "@yulora/markdown-engine";

import type { ActiveBlockState } from "../active-block";
import { buildContinuationPrefix, parseListLine } from "./line-parsers";

export function runListEnter(view: EditorView): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) {
    return false;
  }

  const line = view.state.doc.lineAt(selection.head);
  const parsed = parseListLine(line.text);
  if (!parsed) {
    return false;
  }

  if (parsed.content.trim().length === 0) {
    const deleteTo =
      line.to < view.state.doc.length && view.state.doc.sliceString(line.to, line.to + 1) === "\n"
        ? line.to + 1
        : line.to;

    view.dispatch({
      changes: {
        from: line.from,
        to: deleteTo,
        insert: ""
      },
      selection: {
        anchor: line.from,
        head: line.from
      }
    });
    return true;
  }

  const continuationPrefix = buildContinuationPrefix(parsed);
  const insertAt = selection.head;
  const nextAnchor = insertAt + 1 + continuationPrefix.length;

  view.dispatch({
    changes: {
      from: insertAt,
      to: insertAt,
      insert: `\n${continuationPrefix}`
    },
    selection: {
      anchor: nextAnchor,
      head: nextAnchor
    }
  });

  return true;
}

export function runListIndentOnTab(view: EditorView, activeState: ActiveBlockState): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty || activeState.activeBlock?.type !== "list") {
    return false;
  }

  const currentItemIndex = activeState.activeBlock.items.findIndex(
    (item) => selection.head >= item.startOffset && selection.head <= item.endOffset
  );
  if (currentItemIndex <= 0) {
    return false;
  }

  const currentItem = activeState.activeBlock.items[currentItemIndex]!;
  const previousSiblingIndex = findPreviousSiblingIndex(activeState.activeBlock.items, currentItemIndex);
  if (previousSiblingIndex === -1) {
    return false;
  }

  const subtreeEndOffset = getListItemSubtreeEndOffset(activeState.activeBlock.items, currentItemIndex);
  const subtreeSource = view.state.doc.sliceString(currentItem.startOffset, subtreeEndOffset);
  const indentedSource = subtreeSource
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  const nextAnchor = selection.anchor + 2;

  view.dispatch({
    changes: {
      from: currentItem.startOffset,
      to: subtreeEndOffset,
      insert: indentedSource
    },
    selection: {
      anchor: nextAnchor,
      head: nextAnchor
    }
  });

  return true;
}

function findPreviousSiblingIndex(
  items: readonly ListItemBlock[],
  currentItemIndex: number
): number {
  const currentItem = items[currentItemIndex]!;

  for (let index = currentItemIndex - 1; index >= 0; index -= 1) {
    const candidate = items[index]!;
    if (candidate.indent === currentItem.indent) {
      return index;
    }
  }

  return -1;
}

function getListItemSubtreeEndOffset(
  items: readonly ListItemBlock[],
  currentItemIndex: number
): number {
  const currentItem = items[currentItemIndex]!;
  let subtreeEndOffset = currentItem.endOffset;

  for (let index = currentItemIndex + 1; index < items.length; index += 1) {
    const item = items[index]!;
    if (item.indent <= currentItem.indent) {
      break;
    }

    subtreeEndOffset = item.endOffset;
  }

  return subtreeEndOffset;
}
