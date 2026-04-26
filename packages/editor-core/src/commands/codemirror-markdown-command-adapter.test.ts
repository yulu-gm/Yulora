// @vitest-environment jsdom

import { EditorState, type Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

import { createCodeMirrorMarkdownCommandTarget } from "./codemirror-markdown-command-adapter";

describe("createCodeMirrorMarkdownCommandTarget", () => {
  it("passes cursor-scroll requests into CodeMirror selection transactions", () => {
    const host = document.createElement("div");
    const transactions: Transaction[] = [];
    const state = EditorState.create({
      doc: "Alpha\nBeta",
      extensions: [
        EditorView.updateListener.of((update) => {
          transactions.push(...update.transactions);
        })
      ]
    });
    const view = new EditorView({ state, parent: host });
    const target = createCodeMirrorMarkdownCommandTarget(view);

    target.dispatchSelection({
      anchor: "Alpha\n".length,
      head: "Alpha\n".length,
      scrollIntoView: true
    } as Parameters<typeof target.dispatchSelection>[0] & { scrollIntoView: true });

    expect(transactions.at(-1)?.scrollIntoView).toBe(true);

    view.destroy();
  });
});
