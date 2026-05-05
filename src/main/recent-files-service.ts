import path from "node:path";
import { readFile, rename, writeFile } from "node:fs/promises";

import {
  DEFAULT_RECENT_FILES_SNAPSHOT,
  RECENT_FILES_FILE_NAME,
  type RecentFilesSnapshot,
  createRecentFileEntry,
  normalizeRecentFilesSnapshot,
  serializeRecentFilesSnapshot
} from "../shared/recent-files";
import type { Preferences } from "../shared/preferences";

export type RecentFilesStoreDependencies = {
  readFile: (targetPath: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (targetPath: string, content: string, encoding: BufferEncoding) => Promise<void>;
  rename: (sourcePath: string, targetPath: string) => Promise<void>;
  now: () => number;
};

export type RecentFilesChangeListener = (snapshot: RecentFilesSnapshot) => void;

export type RecentFilesService = {
  initialize: () => Promise<RecentFilesSnapshot>;
  getRecentFiles: () => RecentFilesSnapshot;
  recordFile: (targetPath: string | null | undefined) => Promise<RecentFilesSnapshot>;
  clearFile: (targetPath: string) => Promise<RecentFilesSnapshot>;
  applyMaxEntries: (maxEntries: number) => Promise<RecentFilesSnapshot>;
  onChange: (listener: RecentFilesChangeListener) => () => void;
};

export type CreateRecentFilesServiceInput = {
  userDataDir: string;
  getPreferences: () => Preferences;
  dependencies?: RecentFilesStoreDependencies;
};

const defaultDependencies: RecentFilesStoreDependencies = {
  readFile,
  writeFile,
  rename,
  now: () => Date.now()
};

export function resolveRecentFilesFilePath(userDataDir: string): string {
  return path.join(userDataDir, RECENT_FILES_FILE_NAME);
}

function isNodeErrorWithCode(error: unknown, expectedCode: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string" &&
    (error as NodeJS.ErrnoException).code === expectedCode
  );
}

async function loadRecentFilesFromDisk(
  filePath: string,
  maxEntries: number,
  dependencies: RecentFilesStoreDependencies
): Promise<RecentFilesSnapshot> {
  let rawContent: string;

  try {
    rawContent = await dependencies.readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return DEFAULT_RECENT_FILES_SNAPSHOT;
    }

    return DEFAULT_RECENT_FILES_SNAPSHOT;
  }

  try {
    return normalizeRecentFilesSnapshot(JSON.parse(rawContent), maxEntries);
  } catch {
    return DEFAULT_RECENT_FILES_SNAPSHOT;
  }
}

async function writeRecentFilesToDisk(
  filePath: string,
  snapshot: RecentFilesSnapshot,
  dependencies: RecentFilesStoreDependencies
): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await dependencies.writeFile(tempPath, serializeRecentFilesSnapshot(snapshot), "utf8");
  await dependencies.rename(tempPath, filePath);
}

function snapshotsEqual(left: RecentFilesSnapshot, right: RecentFilesSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createRecentFilesService(
  input: CreateRecentFilesServiceInput
): RecentFilesService {
  const filePath = resolveRecentFilesFilePath(input.userDataDir);
  const dependencies = input.dependencies ?? defaultDependencies;
  const listeners = new Set<RecentFilesChangeListener>();

  let cachedSnapshot = DEFAULT_RECENT_FILES_SNAPSHOT;
  let initializePromise: Promise<RecentFilesSnapshot> | null = null;

  function getMaxEntries(): number {
    return input.getPreferences().recentFiles.maxEntries;
  }

  function notify(): void {
    for (const listener of [...listeners]) {
      try {
        listener(cachedSnapshot);
      } catch {
        // Listener failures must not break main-process state.
      }
    }
  }

  async function commit(nextSnapshot: RecentFilesSnapshot): Promise<RecentFilesSnapshot> {
    if (snapshotsEqual(cachedSnapshot, nextSnapshot)) {
      return cachedSnapshot;
    }

    await writeRecentFilesToDisk(filePath, nextSnapshot, dependencies);
    cachedSnapshot = nextSnapshot;
    notify();
    return cachedSnapshot;
  }

  async function initialize(): Promise<RecentFilesSnapshot> {
    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      cachedSnapshot = await loadRecentFilesFromDisk(filePath, getMaxEntries(), dependencies);
      return cachedSnapshot;
    })();

    return initializePromise;
  }

  function getRecentFiles(): RecentFilesSnapshot {
    return cachedSnapshot;
  }

  async function recordFile(
    targetPath: string | null | undefined
  ): Promise<RecentFilesSnapshot> {
    await initialize();

    if (targetPath === null || targetPath === undefined) {
      return cachedSnapshot;
    }

    const nextEntry = createRecentFileEntry({
      path: targetPath,
      now: dependencies.now()
    });

    if (!nextEntry) {
      return cachedSnapshot;
    }

    return commit(
      normalizeRecentFilesSnapshot(
        {
          entries: [
            nextEntry,
            ...cachedSnapshot.entries.filter((entry) => entry.path !== nextEntry.path)
          ]
        },
        getMaxEntries()
      )
    );
  }

  async function clearFile(targetPath: string): Promise<RecentFilesSnapshot> {
    await initialize();

    return commit(
      normalizeRecentFilesSnapshot(
        {
          entries: cachedSnapshot.entries.filter((entry) => entry.path !== targetPath.trim())
        },
        getMaxEntries()
      )
    );
  }

  async function applyMaxEntries(maxEntries: number): Promise<RecentFilesSnapshot> {
    await initialize();
    return commit(normalizeRecentFilesSnapshot(cachedSnapshot, maxEntries));
  }

  function onChange(listener: RecentFilesChangeListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    initialize,
    getRecentFiles,
    recordFile,
    clearFile,
    applyMaxEntries,
    onChange
  };
}
