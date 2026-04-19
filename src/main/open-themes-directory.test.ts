import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { openThemesDirectory } from "./open-themes-directory";

describe("openThemesDirectory", () => {
  it("creates the themes directory and opens it", async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const openPath = vi.fn().mockResolvedValue("");
    const userDataDir = "C:/Users/chenglinwu/AppData/Roaming/Yulora";
    const themesDirectory = path.join(userDataDir, "themes");

    await openThemesDirectory(userDataDir, {
      mkdir,
      openPath
    });

    expect(mkdir).toHaveBeenCalledWith(themesDirectory, {
      recursive: true
    });
    expect(openPath).toHaveBeenCalledWith(themesDirectory);
  });

  it("throws when the shell reports a failure message", async () => {
    await expect(
      openThemesDirectory("C:/Users/chenglinwu/AppData/Roaming/Yulora", {
        mkdir: vi.fn().mockResolvedValue(undefined),
        openPath: vi.fn().mockResolvedValue("permission denied")
      })
    ).rejects.toThrow("permission denied");
  });
});
