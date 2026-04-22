// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { isFocusedEditorInteractiveElement } from "./App";

describe("isFocusedEditorInteractiveElement", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("treats a focused table cell editor as an interactive editor target", () => {
    const editorContainer = document.createElement("div");
    const tableCellEditor = document.createElement("div");

    tableCellEditor.className = "cm-table-widget-input";
    tableCellEditor.contentEditable = "true";
    tableCellEditor.tabIndex = 0;
    editorContainer.appendChild(tableCellEditor);
    document.body.appendChild(editorContainer);

    tableCellEditor.focus();

    expect(isFocusedEditorInteractiveElement(editorContainer)).toBe(true);
  });

  it("does not treat a focused non-interactive editor wrapper as an interactive target", () => {
    const editorContainer = document.createElement("div");
    const contentWrapper = document.createElement("div");

    contentWrapper.className = "cm-content";
    contentWrapper.tabIndex = 0;
    editorContainer.appendChild(contentWrapper);
    document.body.appendChild(editorContainer);

    contentWrapper.focus();

    expect(isFocusedEditorInteractiveElement(editorContainer)).toBe(false);
  });
});
