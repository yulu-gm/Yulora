export type ThemeEffectsMode = "auto" | "full" | "off";
export type ThemeSurfaceSlot = "workbenchBackground" | "titlebarBackdrop" | "welcomeHero";
export type ThemeStylePart = "ui" | "editor" | "markdown" | "titlebar";

export type ThemeSurfaceDescriptor = {
  kind: "fragment";
  scene: string;
  shader: string;
};

export type ThemePackageManifest = {
  id: string;
  name: string;
  version: string;
  author: string | null;
  supports: { light: boolean; dark: boolean };
  tokens: Partial<Record<"light" | "dark", string>>;
  styles: Partial<Record<ThemeStylePart, string>>;
  layout: { titlebar: string | null };
  scene: { id: string; sharedUniforms: Record<string, number> } | null;
  surfaces: Partial<Record<ThemeSurfaceSlot, ThemeSurfaceDescriptor>>;
};

const THEME_MODES = ["light", "dark"] as const;
const THEME_STYLE_PARTS = ["ui", "editor", "markdown", "titlebar"] as const;
const THEME_SURFACE_SLOTS = ["workbenchBackground", "titlebarBackdrop", "welcomeHero"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePackagePath(raw: unknown, packageRoot: string): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim().replace(/\\/g, "/");

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    return normalized;
  }

  const root = packageRoot.replace(/[/\\]+$/, "");
  return `${root}/${normalized.replace(/^\.\//, "").replace(/^\.\.\//, "")}`;
}

function normalizeModePaths(raw: unknown, packageRoot: string): Partial<Record<"light" | "dark", string>> {
  const source = isRecord(raw) ? raw : {};

  return THEME_MODES.reduce<Record<"light" | "dark", string>>(
    (paths, mode) => {
      const resolved = normalizePackagePath(source[mode], packageRoot);

      if (resolved !== null) {
        paths[mode] = resolved;
      }

      return paths;
    },
    {} as Record<"light" | "dark", string>
  );
}

function normalizeStylePaths(raw: unknown, packageRoot: string): Partial<Record<ThemeStylePart, string>> {
  const source = isRecord(raw) ? raw : {};

  return THEME_STYLE_PARTS.reduce<Partial<Record<ThemeStylePart, string>>>((paths, part) => {
    const resolved = normalizePackagePath(source[part], packageRoot);

    if (resolved !== null) {
      paths[part] = resolved;
    }

    return paths;
  }, {});
}

function normalizeSurfaceDescriptor(
  raw: unknown,
  packageRoot: string
): ThemeSurfaceDescriptor | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (raw.kind !== "fragment") {
    return null;
  }

  const scene = typeof raw.scene === "string" ? raw.scene : null;
  if (typeof scene !== "string" || scene.trim().length === 0) {
    return null;
  }

  const shader = normalizePackagePath(raw.shader, packageRoot);
  if (shader === null) {
    return null;
  }

  return {
    kind: "fragment",
    scene,
    shader
  };
}

function normalizeSurfaces(raw: unknown, packageRoot: string): Partial<Record<ThemeSurfaceSlot, ThemeSurfaceDescriptor>> {
  const source = isRecord(raw) ? raw : {};

  return THEME_SURFACE_SLOTS.reduce<Partial<Record<ThemeSurfaceSlot, ThemeSurfaceDescriptor>>>(
    (surfaces, slot) => {
      const surface = normalizeSurfaceDescriptor(source[slot], packageRoot);

      if (surface !== null) {
        surfaces[slot] = surface;
      }

      return surfaces;
    },
    {}
  );
}

function normalizeSupports(raw: unknown): { light: boolean; dark: boolean } {
  const source = isRecord(raw) ? raw : {};

  return {
    light: source.light === true,
    dark: source.dark === true
  };
}

function normalizeThemeScene(raw: unknown): ThemePackageManifest["scene"] {
  if (!isRecord(raw)) {
    return null;
  }

  if (typeof raw.id !== "string" || raw.id.trim().length === 0) {
    return null;
  }

  const sharedUniformsSource = isRecord(raw.sharedUniforms) ? raw.sharedUniforms : {};

  const sharedUniforms: Record<string, number> = {};
  for (const key in sharedUniformsSource) {
    if (typeof sharedUniformsSource[key] !== "number") {
      continue;
    }

    sharedUniforms[key] = sharedUniformsSource[key];
  }

  return {
    id: raw.id.trim(),
    sharedUniforms
  };
}

export function normalizeThemePackageManifest(
  raw: unknown,
  packageRoot: string
): ThemePackageManifest | null {
  const source = isRecord(raw) ? raw : null;

  if (!source || typeof source.id !== "string" || typeof source.name !== "string") {
    return null;
  }

  return {
    id: source.id.trim(),
    name: source.name.trim(),
    version: typeof source.version === "string" ? source.version : "1.0.0",
    author: typeof source.author === "string" ? source.author : null,
    supports: normalizeSupports(source.supports),
    tokens: normalizeModePaths(source.tokens, packageRoot),
    styles: normalizeStylePaths(source.styles, packageRoot),
    layout: {
      titlebar: normalizePackagePath(isRecord(source.layout) ? source.layout.titlebar : null, packageRoot)
    },
    scene: normalizeThemeScene(source.scene),
    surfaces: normalizeSurfaces(source.surfaces, packageRoot)
  };
}
