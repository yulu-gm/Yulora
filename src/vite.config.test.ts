import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { build } from "vite";
import { afterEach, describe, expect, it } from "vitest";

import viteConfig from "../vite.config";

const backdropDeclarationPattern = /(^|[^-])backdrop-filter:blur\(28px\)saturate\(1\.12\);/;
const webkitBackdropDeclarationPattern = /-webkit-backdrop-filter:blur\(28px\)saturate\(1\.12\);/;

describe("vite renderer build", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    while (tempDirectories.length > 0) {
      const directory = tempDirectories.pop();

      if (directory) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });

  it("preserves standard and prefixed backdrop-filter declarations in built CSS", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "yulora-vite-backdrop-"));
    tempDirectories.push(root);

    writeFileSync(
      path.join(root, "index.html"),
      '<!doctype html><html><head><script type="module" src="/main.js"></script></head><body></body></html>'
    );
    writeFileSync(path.join(root, "main.js"), 'import "./style.css";');
    writeFileSync(
      path.join(root, "style.css"),
      [
        ".settings-shell {",
        "  backdrop-filter: blur(28px) saturate(1.12);",
        "  -webkit-backdrop-filter: blur(28px) saturate(1.12);",
        "}"
      ].join("\n")
    );

    const outDir = path.join(root, "dist");

    await build({
      configFile: false,
      logLevel: "silent",
      root,
      build: {
        outDir,
        emptyOutDir: true,
        cssMinify: viteConfig.build?.cssMinify
      }
    });

    const assetsDirectory = path.join(outDir, "assets");
    const stylesheetName = readdirSync(assetsDirectory).find((entry) => entry.endsWith(".css"));

    expect(stylesheetName).toBeDefined();

    const stylesheet = readFileSync(path.join(assetsDirectory, stylesheetName!), "utf-8").replaceAll(
      /\s+/g,
      ""
    );

    expect(stylesheet).toMatch(backdropDeclarationPattern);
    expect(stylesheet).toMatch(webkitBackdropDeclarationPattern);
  });
});
