import type { ThemeEffectsMode, ThemeSurfaceSlot } from "../../shared/theme-package";

export type ThemeAppearanceMode = "light" | "dark";

export type ThemeSceneViewport = {
  width: number;
  height: number;
};

export type ThemeSceneFrame = {
  sceneId: string;
  surface: ThemeSurfaceSlot;
  time: number;
  viewport: ThemeSceneViewport;
  uniforms: Record<string, number>;
  effectsMode: ThemeEffectsMode;
};

export type ThemeSceneState = {
  readonly sceneId: string;
  readonly effectsMode: ThemeEffectsMode;
  readonly sharedUniformKeys: readonly string[];
  nextFrame: (surface: ThemeSurfaceSlot, viewport: ThemeSceneViewport) => ThemeSceneFrame;
};

type ThemeSceneStateInput = {
  sceneId: string;
  themeMode: ThemeAppearanceMode;
  effectsMode: ThemeEffectsMode;
  sharedUniforms: Record<string, number>;
};

type ThemeSceneStateOptions = {
  now?: () => number;
};

function getNow(): number {
  if (typeof globalThis.performance?.now === "function") {
    return globalThis.performance.now();
  }

  return Date.now();
}

function normalizeViewport(viewport: ThemeSceneViewport): ThemeSceneViewport {
  return {
    width: Number.isFinite(viewport.width) ? Math.max(0, Math.round(viewport.width)) : 0,
    height: Number.isFinite(viewport.height) ? Math.max(0, Math.round(viewport.height)) : 0
  };
}

function cloneUniforms(sharedUniforms: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(sharedUniforms).filter(([, value]) => Number.isFinite(value))
  );
}

function resolveThemeModeUniform(mode: ThemeAppearanceMode): number {
  return mode === "dark" ? 1 : 0;
}

export function createThemeSceneState(
  input: ThemeSceneStateInput,
  options: ThemeSceneStateOptions = {}
): ThemeSceneState {
  const now = options.now ?? getNow;
  const startedAtMs = now();
  const sharedUniforms = {
    ...cloneUniforms(input.sharedUniforms),
    themeMode: resolveThemeModeUniform(input.themeMode)
  };
  const sharedUniformKeys = Object.freeze(Object.keys(sharedUniforms));
  let cachedNowMs: number | null = null;
  let clearScheduled = false;

  function readSharedNowMs(): number {
    if (cachedNowMs !== null) {
      return cachedNowMs;
    }

    cachedNowMs = now();

    if (!clearScheduled) {
      clearScheduled = true;
      queueMicrotask(() => {
        cachedNowMs = null;
        clearScheduled = false;
      });
    }

    return cachedNowMs;
  }

  function nextFrame(surface: ThemeSurfaceSlot, viewport: ThemeSceneViewport): ThemeSceneFrame {
    const currentMs = readSharedNowMs();

    return {
      sceneId: input.sceneId,
      surface,
      time: Math.max(0, (currentMs - startedAtMs) / 1_000),
      viewport: normalizeViewport(viewport),
      uniforms: cloneUniforms(sharedUniforms),
      effectsMode: input.effectsMode
    };
  }

  return {
    sceneId: input.sceneId,
    effectsMode: input.effectsMode,
    sharedUniformKeys,
    nextFrame
  };
}
