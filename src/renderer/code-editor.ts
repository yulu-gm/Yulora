import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

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
  destroy: () => void;
};

export function createCodeEditorController(
  options: CreateCodeEditorControllerOptions
): CodeEditorController {
  let blockMap = parseBlockMap(options.initialContent);
  let activeBlockState = createActiveBlockStateFromBlockMap(blockMap, {
    anchor: 0,
    head: 0
  });
  let isCompositionGuardActive = false;
  let hasPendingDerivedStateFlush = false;

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
  };

  const createState = (content: string) =>
    EditorState.create({
      doc: content,
      extensions: [
        history(),
        keymap.of([...historyKeymap, ...defaultKeymap]),
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

  const handleBlur = () => {
    options.onBlur?.();
  };

  view.dom.addEventListener("compositionstart", handleCompositionStart);
  view.dom.addEventListener("compositionupdate", handleCompositionStart);
  view.dom.addEventListener("compositionend", handleCompositionEnd);
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
    },
    destroy() {
      view.dom.removeEventListener("compositionstart", handleCompositionStart);
      view.dom.removeEventListener("compositionupdate", handleCompositionStart);
      view.dom.removeEventListener("compositionend", handleCompositionEnd);
      view.dom.removeEventListener("focusout", handleBlur);
      view.destroy();
    }
  };
}
