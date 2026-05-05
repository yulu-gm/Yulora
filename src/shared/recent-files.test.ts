import { describe, expect, it } from "vitest";

import {
  DEFAULT_RECENT_FILES_SNAPSHOT,
  normalizeRecentFilesSnapshot
} from "./recent-files";

describe("recent files shared contract", () => {
  it("normalizes malformed snapshots to an empty list", () => {
    expect(normalizeRecentFilesSnapshot(null, 10)).toEqual(DEFAULT_RECENT_FILES_SNAPSHOT);
    expect(normalizeRecentFilesSnapshot({ entries: "bad" }, 10)).toEqual(
      DEFAULT_RECENT_FILES_SNAPSHOT
    );
  });

  it("keeps unique trimmed file paths in order and clamps to the configured maximum", () => {
    const snapshot = normalizeRecentFilesSnapshot(
      {
        entries: [
          { path: "  /notes/today.md  ", name: "Today.md", lastOpenedAt: 20 },
          { path: "/notes/ideas.md", name: "", lastOpenedAt: 10 },
          { path: "/notes/today.md", name: "Duplicate.md", lastOpenedAt: 30 },
          { path: "", name: "Empty.md", lastOpenedAt: 40 },
          { path: "/notes/archive.md", name: "Archive.md", lastOpenedAt: Number.NaN }
        ]
      },
      2
    );

    expect(snapshot.entries).toEqual([
      { path: "/notes/today.md", name: "Today.md", lastOpenedAt: 20 },
      { path: "/notes/ideas.md", name: "ideas.md", lastOpenedAt: 10 }
    ]);
  });
});
