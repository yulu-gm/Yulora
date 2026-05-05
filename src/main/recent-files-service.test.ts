import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PREFERENCES, type Preferences } from "../shared/preferences";
import { createRecentFilesService } from "./recent-files-service";

function createPreferences(maxEntries: number): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    recentFiles: {
      ...DEFAULT_PREFERENCES.recentFiles,
      maxEntries
    }
  };
}

describe("recent files service", () => {
  it("records successful documents with newest-first ordering, deduplication, and max-entry pruning", async () => {
    const writes: string[] = [];
    let now = 100;
    const service = createRecentFilesService({
      userDataDir: "/user-data",
      getPreferences: () => createPreferences(2),
      dependencies: {
        readFile: vi.fn(async () => {
          const error = new Error("missing") as NodeJS.ErrnoException;
          error.code = "ENOENT";
          throw error;
        }),
        writeFile: vi.fn(async (_targetPath, content) => {
          writes.push(content);
        }),
        rename: vi.fn(async () => undefined),
        now: () => now++
      }
    });

    await service.initialize();
    await service.recordFile("/notes/alpha.md");
    await service.recordFile("/notes/beta.md");
    await service.recordFile("/notes/alpha.md");
    await service.recordFile("/notes/gamma.md");

    expect(service.getRecentFiles().entries).toEqual([
      { path: "/notes/gamma.md", name: "gamma.md", lastOpenedAt: 103 },
      { path: "/notes/alpha.md", name: "alpha.md", lastOpenedAt: 102 }
    ]);
    expect(JSON.parse(writes.at(-1) ?? "{}")).toEqual(service.getRecentFiles());
  });

  it("loads persisted entries, clears invalid paths, and notifies listeners", async () => {
    const listener = vi.fn();
    const service = createRecentFilesService({
      userDataDir: "/user-data",
      getPreferences: () => createPreferences(10),
      dependencies: {
        readFile: vi.fn(async () =>
          JSON.stringify({
            entries: [
              { path: "/notes/missing.md", name: "missing.md", lastOpenedAt: 2 },
              { path: "/notes/live.md", name: "live.md", lastOpenedAt: 1 }
            ]
          })
        ),
        writeFile: vi.fn(async () => undefined),
        rename: vi.fn(async () => undefined),
        now: () => 10
      }
    });

    service.onChange(listener);
    await service.initialize();
    await service.clearFile("/notes/missing.md");

    expect(service.getRecentFiles().entries).toEqual([
      { path: "/notes/live.md", name: "live.md", lastOpenedAt: 1 }
    ]);
    expect(listener).toHaveBeenCalledWith(service.getRecentFiles());
  });

  it("prunes existing entries when the max-entry preference changes", async () => {
    const service = createRecentFilesService({
      userDataDir: "/user-data",
      getPreferences: () => createPreferences(10),
      dependencies: {
        readFile: vi.fn(async () =>
          JSON.stringify({
            entries: [
              { path: "/notes/one.md", name: "one.md", lastOpenedAt: 3 },
              { path: "/notes/two.md", name: "two.md", lastOpenedAt: 2 },
              { path: "/notes/three.md", name: "three.md", lastOpenedAt: 1 }
            ]
          })
        ),
        writeFile: vi.fn(async () => undefined),
        rename: vi.fn(async () => undefined),
        now: () => 10
      }
    });

    await service.initialize();
    await service.applyMaxEntries(1);

    expect(service.getRecentFiles().entries).toEqual([
      { path: "/notes/one.md", name: "one.md", lastOpenedAt: 3 }
    ]);
  });
});
