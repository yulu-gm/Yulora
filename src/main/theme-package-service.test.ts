import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createThemePackageService } from "./theme-package-service";

describe("createThemePackageService", () => {
  it("discovers manifest-driven theme packages and legacy CSS families together", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "yulora-theme-packages-"));
    const userDataDir = path.join(root, "userdata");
    await mkdir(path.join(userDataDir, "themes", "rain-glass", "styles"), { recursive: true });
    await writeFile(
      path.join(userDataDir, "themes", "rain-glass", "manifest.json"),
      JSON.stringify({
        id: "rain-glass",
        name: "Rain Glass",
        version: "1.0.0",
        supports: { light: true, dark: true },
        styles: { ui: "./styles/ui.css" }
      }),
      "utf8"
    );
    await writeFile(path.join(userDataDir, "themes", "rain-glass", "styles", "ui.css"), "/* ui */");
    await mkdir(path.join(userDataDir, "themes", "graphite", "dark"), { recursive: true });
    await writeFile(path.join(userDataDir, "themes", "graphite", "dark", "ui.css"), "/* legacy */");

    const service = createThemePackageService({ userDataDir });
    const packages = await service.listThemePackages();

    expect(packages.map((entry) => entry.id)).toEqual(["graphite", "rain-glass"]);
    expect(packages.find((entry) => entry.id === "rain-glass")?.manifest.name).toBe("Rain Glass");
    expect(packages.find((entry) => entry.id === "graphite")?.kind).toBe("legacy-css-family");

    await rm(root, { recursive: true, force: true });
  });
});
