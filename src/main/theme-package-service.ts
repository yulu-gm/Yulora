import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { normalizeThemePackageManifest, type ThemePackageManifest } from "../shared/theme-package";

type ThemePackageKind = "manifest-package" | "legacy-css-family";

export type ThemePackageDescriptor = {
  id: string;
  kind: ThemePackageKind;
  source: "builtin" | "community";
  packageRoot: string;
  manifest: ThemePackageManifest;
};

type ThemePackageServiceDependencies = {
  readdir: (targetPath: string, options: { withFileTypes: true }) => Promise<
    import("node:fs").Dirent[]
  >;
  readFile: (targetPath: string, options: { encoding: BufferEncoding }) => Promise<string>;
};

export type CreateThemePackageServiceInput = {
  userDataDir: string;
  dependencies?: Partial<ThemePackageServiceDependencies>;
};

type ThemePackageService = {
  listThemePackages: () => Promise<ThemePackageDescriptor[]>;
  refreshThemePackages: () => Promise<ThemePackageDescriptor[]>;
};

const defaultDependencies: ThemePackageServiceDependencies = {
  readdir: (targetPath, options) => readdir(targetPath, options),
  readFile: (targetPath, options) => readFile(targetPath, options)
};

function makeThemeName(directoryName: string): string {
  return directoryName
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join(" ");
}

async function safeReadDir(
  targetPath: string,
  dependencies: ThemePackageServiceDependencies
): Promise<import("node:fs").Dirent[]> {
  try {
    return await dependencies.readdir(targetPath, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    return [];
  }
}

async function readManifestIfPresent(
  manifestPath: string,
  packageRoot: string,
  dependencies: ThemePackageServiceDependencies
): Promise<ThemePackageManifest | null> {
  try {
    const rawManifest = await dependencies.readFile(manifestPath, { encoding: "utf8" });
    return normalizeThemePackageManifest(JSON.parse(rawManifest), packageRoot);
  } catch {
    return null;
  }
}

function createLegacyManifest(
  directoryName: string,
  supports: { light: boolean; dark: boolean }
): ThemePackageManifest {
  return {
    id: directoryName,
    name: makeThemeName(directoryName),
    version: "1.0.0",
    author: null,
    supports,
    tokens: {},
    styles: {},
    layout: { titlebar: null },
    scene: null,
    surfaces: {}
  };
}

async function createLegacyCssFamilyDescriptor(
  packageRoot: string,
  directoryName: string,
  dependencies: ThemePackageServiceDependencies
): Promise<ThemePackageDescriptor | null> {
  const children = await safeReadDir(packageRoot, dependencies);
  const modeDirectories = new Map(
    children
      .filter((entry) => entry.isDirectory())
      .filter((entry) => entry.name === "light" || entry.name === "dark")
      .map((entry) => [entry.name, path.join(packageRoot, entry.name)] as const)
  );

  const supports = {
    light: false,
    dark: false
  };

  for (const mode of ["light", "dark"] as const) {
    const modeDirectory = modeDirectories.get(mode);

    if (!modeDirectory) {
      continue;
    }

    const modeEntries = await safeReadDir(modeDirectory, dependencies);
    supports[mode] = modeEntries.some((entry) => entry.isFile() && entry.name.endsWith(".css"));
  }

  if (!supports.light && !supports.dark) {
    return null;
  }

  return {
    id: directoryName,
    kind: "legacy-css-family",
    source: "community",
    packageRoot,
    manifest: createLegacyManifest(directoryName, supports)
  };
}

async function scanThemePackages(
  userDataDir: string,
  dependencies: ThemePackageServiceDependencies
): Promise<ThemePackageDescriptor[]> {
  const themesDir = path.join(userDataDir, "themes");
  const entries = await safeReadDir(themesDir, dependencies);

  const packages = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const packageRoot = path.join(themesDir, entry.name);
        const manifest = await readManifestIfPresent(
          path.join(packageRoot, "manifest.json"),
          packageRoot,
          dependencies
        );

        if (manifest) {
          return {
            id: manifest.id,
            kind: "manifest-package" as const,
            source: "community" as const,
            packageRoot,
            manifest
          };
        }

        return createLegacyCssFamilyDescriptor(packageRoot, entry.name, dependencies);
      })
  );

  return packages
    .filter((entry): entry is ThemePackageDescriptor => entry !== null)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function createThemePackageService(input: CreateThemePackageServiceInput): ThemePackageService {
  const dependencies: ThemePackageServiceDependencies = {
    ...defaultDependencies,
    ...(input.dependencies ?? {})
  };

  let cache: ThemePackageDescriptor[] | null = null;

  return {
    async listThemePackages() {
      if (!cache) {
        cache = await scanThemePackages(input.userDataDir, dependencies);
      }

      return [...cache];
    },
    async refreshThemePackages() {
      cache = await scanThemePackages(input.userDataDir, dependencies);
      return [...cache];
    }
  };
}
