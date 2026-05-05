export const RECENT_FILES_FILE_NAME = "recent-files.json";
export const RECENT_FILES_SCHEMA_VERSION = 1 as const;

export const GET_RECENT_FILES_CHANNEL = "fishmark:get-recent-files";
export const CLEAR_RECENT_FILE_CHANNEL = "fishmark:clear-recent-file";
export const RECENT_FILES_CHANGED_EVENT = "fishmark:recent-files-changed";

export type RecentFileEntry = {
  path: string;
  name: string;
  lastOpenedAt: number;
};

export type RecentFilesSnapshot = {
  version: typeof RECENT_FILES_SCHEMA_VERSION;
  entries: RecentFileEntry[];
};

export type ClearRecentFileInput = {
  path: string;
};

export const DEFAULT_RECENT_FILES_SNAPSHOT: RecentFilesSnapshot = {
  version: RECENT_FILES_SCHEMA_VERSION,
  entries: []
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function resolveFileName(targetPath: string, fallbackName: unknown): string {
  if (typeof fallbackName === "string") {
    const trimmedName = fallbackName.trim();
    if (trimmedName.length > 0) {
      return trimmedName;
    }
  }

  const normalizedPath = targetPath.replace(/\\/g, "/");
  const name = normalizedPath.split("/").filter(Boolean).at(-1);
  return name && name.length > 0 ? name : targetPath;
}

function normalizeLastOpenedAt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function normalizeMaxEntries(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_RECENT_FILES_SNAPSHOT.entries.length;
  }

  return Math.max(0, Math.round(value));
}

export function createRecentFileEntry(input: {
  path: string;
  now: number;
}): RecentFileEntry | null {
  const normalizedPath = normalizePath(input.path);

  if (!normalizedPath) {
    return null;
  }

  return {
    path: normalizedPath,
    name: resolveFileName(normalizedPath, null),
    lastOpenedAt: normalizeLastOpenedAt(input.now)
  };
}

export function normalizeRecentFilesSnapshot(
  raw: unknown,
  maxEntries: number
): RecentFilesSnapshot {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) {
    return DEFAULT_RECENT_FILES_SNAPSHOT;
  }

  const seen = new Set<string>();
  const entries: RecentFileEntry[] = [];
  const entryLimit = normalizeMaxEntries(maxEntries);

  for (const entrySource of raw.entries) {
    if (!isRecord(entrySource)) {
      continue;
    }

    const normalizedPath = normalizePath(entrySource.path);
    if (!normalizedPath || seen.has(normalizedPath)) {
      continue;
    }

    seen.add(normalizedPath);
    entries.push({
      path: normalizedPath,
      name: resolveFileName(normalizedPath, entrySource.name),
      lastOpenedAt: normalizeLastOpenedAt(entrySource.lastOpenedAt)
    });

    if (entries.length >= entryLimit) {
      break;
    }
  }

  return {
    version: RECENT_FILES_SCHEMA_VERSION,
    entries
  };
}

export function serializeRecentFilesSnapshot(snapshot: RecentFilesSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}
