import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("GitHub Pages site", () => {
  it("keeps the marketing homepage in a separate static site entry", () => {
    const siteIndexPath = path.join(process.cwd(), "site", "index.html");
    const rendererIndexPath = path.join(process.cwd(), "src", "renderer", "index.html");

    expect(existsSync(siteIndexPath)).toBe(true);
    expect(readFileSync(rendererIndexPath, "utf8")).toContain('id="root"');

    const siteIndexSource = readFileSync(siteIndexPath, "utf8");

    expect(siteIndexSource).toContain("<title>FishMark");
    expect(siteIndexSource).toContain("https://github.com/yulu-gm/FishMark");
    expect(siteIndexSource).toContain("https://github.com/yulu-gm/FishMark/releases");
  });

  it("defines targets for the homepage navigation anchors", () => {
    const siteIndexPath = path.join(process.cwd(), "site", "index.html");
    const siteIndexSource = readFileSync(siteIndexPath, "utf8");

    for (const anchorId of ["features", "shortcuts", "tech", "download"]) {
      expect(siteIndexSource).toContain(`href="#${anchorId}"`);
      expect(siteIndexSource).toContain(`id="${anchorId}"`);
    }
  });

  it("adds safe rel attributes to links that open a new tab", () => {
    const siteIndexPath = path.join(process.cwd(), "site", "index.html");
    const siteIndexSource = readFileSync(siteIndexPath, "utf8");
    const blankLinks = Array.from(siteIndexSource.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)).map(
      (match) => match[0]
    );

    expect(blankLinks.length).toBeGreaterThan(0);
    for (const link of blankLinks) {
      expect(link).toContain('rel="noopener noreferrer"');
    }
  });

  it("points macOS downloads to the current Apple Silicon beta release", () => {
    const siteIndexPath = path.join(process.cwd(), "site", "index.html");
    const siteIndexSource = readFileSync(siteIndexPath, "utf8");

    expect(siteIndexSource).toContain("https://github.com/yulu-gm/FishMark/releases/tag/v0.2.2-mac-beta");
    expect(siteIndexSource).toContain("macOS Beta");
    expect(siteIndexSource).toContain("Apple Silicon");
    expect(siteIndexSource).not.toContain("Apple Silicon · Intel");
  });

  it("publishes the static site directory through GitHub Pages Actions", () => {
    const workflowPath = path.join(process.cwd(), ".github", "workflows", "pages.yml");

    expect(existsSync(workflowPath)).toBe(true);

    const workflowSource = readFileSync(workflowPath, "utf8");

    expect(workflowSource).toContain("github-pages");
    expect(workflowSource).toContain("branches: [main]");
    expect(workflowSource).toContain("actions/configure-pages");
    expect(workflowSource).toContain("actions/upload-pages-artifact");
    expect(workflowSource).toContain("path: site");
    expect(workflowSource).toContain("actions/deploy-pages");
  });
});
