import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("main process window wiring", () => {
  it("passes the resolved window icon path into the runtime window manager", () => {
    const mainPath = path.join(process.cwd(), "src", "main", "main.ts");
    const mainSource = readFileSync(mainPath, "utf8");

    expect(mainSource).toContain("windowIconPath: resolveWindowIconPath()");
  });
});
