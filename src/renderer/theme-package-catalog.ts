import { createBuiltinThemePackageDescriptor } from "./theme-runtime";
import type { ThemePackageRuntimeDescriptor } from "./theme-package-runtime";

type ThemePackageEntry = Awaited<ReturnType<Window["yulora"]["listThemePackages"]>>[number];

export type ThemePackageFallbackReason = "missing-theme" | "unsupported-mode" | null;

export type ActiveThemePackageResolution = {
  requestedId: string | null;
  descriptor: ThemePackageRuntimeDescriptor;
  fallbackReason: ThemePackageFallbackReason;
};

function toRuntimePackageDescriptor(entry: ThemePackageEntry): ThemePackageRuntimeDescriptor {
  return {
    id: entry.id,
    tokens: entry.manifest.tokens,
    styles: entry.manifest.styles
  };
}

function resolveLegacyThemeFamilyId(themeId: string): string | null {
  const migrated = themeId.replace(/(?:-|_)(light|dark)$/u, "");
  return migrated === themeId ? null : migrated;
}

function createBuiltinFallbackDescriptor(mode: "light" | "dark"): ThemePackageRuntimeDescriptor {
  return createBuiltinThemePackageDescriptor(mode);
}

export function resolveActiveThemePackage(
  selectedId: string | null,
  packages: ThemePackageEntry[],
  mode: "light" | "dark"
): ActiveThemePackageResolution {
  const selected = selectedId
    ? packages.find((entry) => entry.id === selectedId) ??
      (resolveLegacyThemeFamilyId(selectedId)
        ? packages.find((entry) => entry.id === resolveLegacyThemeFamilyId(selectedId))
        : null) ??
      null
    : null;

  if (!selected) {
    return {
      requestedId: selectedId,
      descriptor: createBuiltinFallbackDescriptor(mode),
      fallbackReason: selectedId ? "missing-theme" : null
    };
  }

  if (!selected.manifest.supports[mode]) {
    return {
      requestedId: selectedId,
      descriptor: createBuiltinFallbackDescriptor(mode),
      fallbackReason: "unsupported-mode"
    };
  }

  return {
    requestedId: selectedId,
    descriptor: toRuntimePackageDescriptor(selected),
    fallbackReason: null
  };
}
