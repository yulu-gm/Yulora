// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { createCodeEditorController } from "./code-editor";

describe("createCodeEditorController", () => {
  it("returns the current content and can replace the loaded document", () => {
    const host = document.createElement("div");
    const controller = createCodeEditorController({
      parent: host,
      initialContent: "# Title\n",
      onChange: vi.fn()
    });

    expect(controller.getContent()).toBe("# Title\n");

    controller.replaceDocument("## Updated\n");

    expect(controller.getContent()).toBe("## Updated\n");

    controller.destroy();
  });

  it("calls onBlur when the editor loses focus", () => {
    const host = document.createElement("div");
    const onBlur = vi.fn();

    const controller = createCodeEditorController({
      parent: host,
      initialContent: "# Title\n",
      onChange: vi.fn(),
      onBlur
    });

    const editorRoot = host.querySelector(".cm-editor");

    expect(editorRoot).not.toBeNull();

    editorRoot?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(onBlur).toHaveBeenCalledTimes(1);

    controller.destroy();
  });
});
