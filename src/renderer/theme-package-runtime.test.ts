// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import { createThemePackageRuntime } from "./theme-package-runtime";

describe("theme package runtime", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("mounts tokens, ui, titlebar, editor, and markdown links in stable order", () => {
    const runtime = createThemePackageRuntime(document);

    runtime.applyPackage(
      {
        id: "rain-glass",
        styles: {
          ui: "file:///theme/ui.css",
          titlebar: "file:///theme/titlebar.css",
          editor: "file:///theme/editor.css"
        },
        tokens: {
          dark: "file:///theme/tokens-dark.css"
        }
      },
      "dark"
    );

    expect(
      Array.from(document.head.querySelectorAll("link[data-yulora-theme-part]")).map((node) =>
        node.getAttribute("href")
      )
    ).toEqual([
      "file:///theme/tokens-dark.css",
      "file:///theme/ui.css",
      "file:///theme/titlebar.css",
      "file:///theme/editor.css"
    ]);
  });
});
