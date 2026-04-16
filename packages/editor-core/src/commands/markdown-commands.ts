import { deleteCharBackward, insertNewlineAndIndent } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";

import type { ActiveBlockState } from "../active-block";
import { runBlockquoteEnter } from "./blockquote-commands";
import { runCodeFenceBackspace, runCodeFenceEnter } from "./code-fence-commands";
import { runListEnter } from "./list-commands";

export function runMarkdownEnter(view: EditorView, activeState: ActiveBlockState): boolean {
  return (
    runCodeFenceEnter(view, activeState) ||
    runListEnter(view) ||
    runBlockquoteEnter(view) ||
    insertNewlineAndIndent(view)
  );
}

export function runMarkdownBackspace(view: EditorView, activeState: ActiveBlockState): boolean {
  return runCodeFenceBackspace(view, activeState) || deleteCharBackward(view);
}
