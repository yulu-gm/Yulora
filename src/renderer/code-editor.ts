import {
  defaultKeymap,
  history,
  historyKeymap,
  insertNewlineAndIndent
} from "@codemirror/commands";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, keymap } from "@codemirror/view";

import {
  createActiveBlockStateFromBlockMap,
  type ActiveBlockState
} from "../../packages/editor-core/src";
import { parseBlockMap } from "../../packages/markdown-engine/src";

export type CreateCodeEditorControllerOptions = {
  parent: Element;
  initialContent: string;
  onChange: (content: string) => void;
  onBlur?: () => void;
  onActiveBlockChange?: (state: ActiveBlockState) => void;
};

export type CodeEditorController = {
  getContent: () => string;
  replaceDocument: (nextContent: string) => void;
  insertText: (text: string) => void;
  setSelection: (anchor: number, head?: number) => void;
  pressEnter: () => void;
  destroy: () => void;
};

const setHeadingDecorationsEffect = StateEffect.define<DecorationSet>();

const headingDecorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let nextDecorations = decorations.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (effect.is(setHeadingDecorationsEffect)) {
        nextDecorations = effect.value;
      }
    }

    return nextDecorations;
  },
  provide: (field) => EditorView.decorations.from(field)
});

export function createCodeEditorController(
  options: CreateCodeEditorControllerOptions
): CodeEditorController {
  let blockMap = parseBlockMap(options.initialContent);
  let activeBlockState = createActiveBlockStateFromBlockMap(blockMap, {
    anchor: 0,
    head: 0
  });
  let headingDecorationSignature = "";
  let hasEditorFocus = false;
  let isCompositionGuardActive = false;
  let hasPendingDerivedStateFlush = false;
  let applyHeadingDecorations: (force?: boolean) => void = () => {};

  const createSelectionSnapshot = (state: EditorState) => ({
    anchor: state.selection.main.anchor,
    head: state.selection.main.head
  });

  const notifyActiveBlockChange = (nextState: ActiveBlockState, force = false) => {
    const didChange =
      force ||
      activeBlockState.selection.anchor !== nextState.selection.anchor ||
      activeBlockState.selection.head !== nextState.selection.head ||
      activeBlockState.activeBlock?.id !== nextState.activeBlock?.id ||
      activeBlockState.blockMap !== nextState.blockMap;

    activeBlockState = nextState;

    if (didChange) {
      options.onActiveBlockChange?.(nextState);
    }
  };

  const recomputeDerivedState = (state: EditorState, force = false) => {
    blockMap = parseBlockMap(state.doc.toString());
    notifyActiveBlockChange(
      createActiveBlockStateFromBlockMap(blockMap, createSelectionSnapshot(state)),
      force
    );
    applyHeadingDecorations(force);
  };

  const createHeadingDecorations = (state: ActiveBlockState, source: string) => {
    const activeBlockId = hasEditorFocus ? state.activeBlock?.id ?? null : null;
    const ranges = [];
    const signatures: string[] = [];

    for (const block of state.blockMap.blocks) {
      if (block.id === activeBlockId) {
        continue;
      }

      if (block.type === "heading") {
        signatures.push(`${block.type}:${block.id}:${block.startOffset}:${block.depth}`);
        const markerEnd = getInactiveHeadingMarkerEnd(block.startOffset, block.depth, source);
        ranges.push(
          Decoration.line({
            attributes: {
              class: `cm-inactive-heading cm-inactive-heading-depth-${block.depth}`
            }
          }).range(block.startOffset)
        );
        ranges.push(
          Decoration.mark({
            attributes: {
              class: "cm-inactive-heading-marker"
            }
          }).range(block.startOffset, markerEnd)
        );
      }

      if (block.type === "paragraph") {
        signatures.push(`${block.type}:${block.id}:${block.startOffset}`);
        ranges.push(
          Decoration.line({
            attributes: {
              class: "cm-inactive-paragraph cm-inactive-paragraph-leading"
            }
          }).range(block.startOffset)
        );
      }

      if (block.type === "list") {
        signatures.push(
          `${block.type}:${block.id}:${block.ordered}:${block.items
            .map((item) => `${item.id}:${item.indent}:${item.task?.checked ?? "none"}`)
            .join(",")}`
        );

        for (const item of block.items) {
          const lineClasses = [
            "cm-inactive-list",
            block.ordered ? "cm-inactive-list-ordered" : "cm-inactive-list-unordered",
            `cm-inactive-list-depth-${Math.floor(item.indent / 2)}`
          ];

          if (item.task) {
            lineClasses.push(
              "cm-inactive-list-task",
              item.task.checked
                ? "cm-inactive-list-task-checked"
                : "cm-inactive-list-task-unchecked"
            );
          }

          ranges.push(
            Decoration.line({
              attributes: {
                class: lineClasses.join(" ")
              }
            }).range(item.startOffset)
          );

          ranges.push(
            Decoration.mark({
              attributes: {
                class: "cm-inactive-list-marker"
              }
            }).range(item.markerStart, item.markerEnd)
          );

          if (item.task) {
            ranges.push(
              Decoration.mark({
              attributes: {
                class: [
                  "cm-inactive-task-marker",
                  item.task.checked
                    ? "cm-inactive-task-marker-checked"
                    : "cm-inactive-task-marker-unchecked"
                ].join(" "),
                "data-task-state": item.task.checked ? "checked" : "unchecked"
              }
            }).range(item.task.markerStart, item.task.markerEnd)
          );
          }
        }
      }
    }

    return {
      decorationSet: Decoration.set(ranges, true),
      signature: signatures.join("|")
    };
  };

  const createState = (content: string) =>
    EditorState.create({
      doc: content,
      extensions: [
        headingDecorationsField,
        history(),
        keymap.of([
          {
            key: "Enter",
            run: (editorView) => {
              return runListEnter(editorView) || insertNewlineAndIndent(editorView);
            }
          },
          ...historyKeymap,
          ...defaultKeymap
        ]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": "Markdown editor",
          spellcheck: "false"
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            options.onChange(update.state.doc.toString());
          }

          if (!update.docChanged && !update.selectionSet) {
            return;
          }

          if (
            isCompositionGuardActive ||
            update.view.compositionStarted ||
            update.view.composing
          ) {
            hasPendingDerivedStateFlush = true;
            return;
          }

          recomputeDerivedState(update.state);
        })
      ]
    });

  const initialState = createState(options.initialContent);
  activeBlockState = createActiveBlockStateFromBlockMap(
    blockMap,
    createSelectionSnapshot(initialState)
  );

  const view = new EditorView({
    state: initialState,
    parent: options.parent
  });

  applyHeadingDecorations = (force = false) => {
    const { decorationSet, signature } = createHeadingDecorations(
      activeBlockState,
      view.state.doc.toString()
    );

    if (!force && signature === headingDecorationSignature) {
      return;
    }

    headingDecorationSignature = signature;
    view.dispatch({
      effects: setHeadingDecorationsEffect.of(decorationSet)
    });
  };

  applyHeadingDecorations(true);
  options.onActiveBlockChange?.(activeBlockState);

  const handleCompositionStart = () => {
    isCompositionGuardActive = true;
  };

  const handleCompositionEnd = () => {
    isCompositionGuardActive = false;

    if (!hasPendingDerivedStateFlush) {
      return;
    }

    hasPendingDerivedStateFlush = false;
    recomputeDerivedState(view.state, true);
  };

  const syncBlurDecorations = () => {
    queueMicrotask(() => {
      const nextHasEditorFocus = view.hasFocus;

      if (hasEditorFocus === nextHasEditorFocus) {
        return;
      }

      hasEditorFocus = nextHasEditorFocus;
      applyHeadingDecorations(true);
    });
  };

  const handleFocusIn = () => {
    if (hasEditorFocus) {
      return;
    }

    hasEditorFocus = true;
    applyHeadingDecorations(true);
  };

  const handleBlur = () => {
    syncBlurDecorations();
    options.onBlur?.();
  };

  view.dom.addEventListener("compositionstart", handleCompositionStart);
  view.dom.addEventListener("compositionupdate", handleCompositionStart);
  view.dom.addEventListener("compositionend", handleCompositionEnd);
  view.dom.addEventListener("focusin", handleFocusIn);
  view.dom.addEventListener("focusout", handleBlur);

  return {
    getContent: () => view.state.doc.toString(),
    replaceDocument(nextContent: string) {
      isCompositionGuardActive = false;
      hasPendingDerivedStateFlush = false;
      blockMap = parseBlockMap(nextContent);
      const nextState = createState(nextContent);

      view.setState(nextState);
      notifyActiveBlockChange(
        createActiveBlockStateFromBlockMap(blockMap, createSelectionSnapshot(nextState)),
        true
      );
      applyHeadingDecorations(true);
    },
    insertText(text: string) {
      const selection = view.state.selection.main;
      const nextAnchor = selection.from + text.length;

      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: text
        },
        selection: {
          anchor: nextAnchor,
          head: nextAnchor
        }
      });
    },
    setSelection(anchor: number, head = anchor) {
      view.dispatch({
        selection: {
          anchor,
          head
        }
      });
    },
    pressEnter() {
      if (!runListEnter(view)) {
        insertNewlineAndIndent(view);
      }
    },
    destroy() {
      view.dom.removeEventListener("compositionstart", handleCompositionStart);
      view.dom.removeEventListener("compositionupdate", handleCompositionStart);
      view.dom.removeEventListener("compositionend", handleCompositionEnd);
      view.dom.removeEventListener("focusin", handleFocusIn);
      view.dom.removeEventListener("focusout", handleBlur);
      view.destroy();
    }
  };
}

function getInactiveHeadingMarkerEnd(startOffset: number, depth: number, source: string): number {
  let endOffset = startOffset + depth;

  while (endOffset < source.length) {
    const character = source[endOffset];
    if (character !== " " && character !== "\t") {
      break;
    }
    endOffset += 1;
  }

  return endOffset;
}

type ParsedListLine =
  | {
      indent: string;
      marker: string;
      task: null;
      content: string;
    }
  | {
      indent: string;
      marker: string;
      task: {
        checked: boolean;
      };
      content: string;
    };

const LIST_LINE_PATTERN = /^(\s*)([*+-]|\d+[.)])(?:[ \t]+|$)(.*)$/;
const TASK_CONTENT_PATTERN = /^\[( |x|X)\](?:[ \t]+|$)(.*)$/;

function runListEnter(view: EditorView): boolean {
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

function parseListLine(text: string): ParsedListLine | null {
  const match = LIST_LINE_PATTERN.exec(text);
  if (!match) {
    return null;
  }

  const indent = match[1] ?? "";
  const marker = match[2] ?? "-";
  const remainder = match[3] ?? "";
  const taskMatch = TASK_CONTENT_PATTERN.exec(remainder);

  if (!taskMatch) {
    return {
      indent,
      marker,
      task: null,
      content: remainder
    };
  }

  return {
    indent,
    marker,
    task: {
      checked: taskMatch[1]?.toLowerCase() === "x"
    },
    content: taskMatch[2] ?? ""
  };
}

function buildContinuationPrefix(parsed: ParsedListLine): string {
  const basePrefix = `${parsed.indent}${incrementListMarker(parsed.marker)} `;

  if (!parsed.task) {
    return basePrefix;
  }

  return `${basePrefix}[ ] `;
}

function incrementListMarker(marker: string): string {
  const orderedMatch = /^(\d+)([.)])$/.exec(marker);
  if (!orderedMatch) {
    return marker;
  }

  return `${Number.parseInt(orderedMatch[1] ?? "1", 10) + 1}${orderedMatch[2] ?? "."}`;
}
