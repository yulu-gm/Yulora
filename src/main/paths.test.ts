import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRendererEntry } from "./paths";

describe("resolveRendererEntry", () => {
  it("prefers the dev server when provided", () => {
    expect(resolveRendererEntry("/tmp/dist", "http://127.0.0.1:5173")).toBe(
      "http://127.0.0.1:5173"
    );
  });

  it("falls back to the built renderer html", () => {
    expect(resolveRendererEntry("/tmp/dist")).toBe(path.join("/tmp/dist", "index.html"));
  });
});
