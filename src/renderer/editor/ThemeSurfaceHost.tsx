import { useEffect, useRef, useState } from "react";

import type { ThemeEffectsMode, ThemeSurfaceSlot } from "../../shared/theme-package";
import { createThemeSceneState } from "../shader/theme-scene-state";
import {
  createThemeSurfaceRuntime,
  type ThemeSurfaceRuntimeMode
} from "../shader/theme-surface-runtime";

export type ThemeSurfaceHostDescriptor = {
  kind: "fragment";
  sceneId: string;
  shaderUrl: string;
  sharedUniforms: Record<string, number>;
};

type ThemeSurfaceHostProps = {
  surface: ThemeSurfaceSlot;
  descriptor: ThemeSurfaceHostDescriptor;
  effectsMode: ThemeEffectsMode;
};

export function ThemeSurfaceHost({
  surface,
  descriptor,
  effectsMode
}: ThemeSurfaceHostProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef(createThemeSurfaceRuntime());
  const [mode, setMode] = useState<ThemeSurfaceRuntimeMode>("fallback");

  useEffect(() => {
    let isDisposed = false;
    let mountedSurface: { unmount: () => void } | null = null;
    const abortController = new AbortController();

    setMode("fallback");

    async function loadAndMount(): Promise<void> {
      try {
        const response = await fetch(descriptor.shaderUrl, {
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`Shader request failed with status ${response.status}.`);
        }

        const shaderSource = await response.text();

        if (isDisposed) {
          return;
        }

        const sceneState = createThemeSceneState({
          sceneId: descriptor.sceneId,
          effectsMode,
          sharedUniforms: descriptor.sharedUniforms
        });
        const result = await runtimeRef.current.mount({
          canvas: canvasRef.current,
          surface,
          shaderSource,
          effectsMode,
          sceneState
        });

        if (isDisposed) {
          result.unmount();
          return;
        }

        mountedSurface = result;
        setMode(result.mode);
      } catch {
        if (!isDisposed) {
          setMode("fallback");
        }
      }
    }

    void loadAndMount();

    return () => {
      isDisposed = true;
      abortController.abort();
      mountedSurface?.unmount();
    };
  }, [descriptor, effectsMode, surface]);

  return (
    <div
      className="theme-surface-host"
      data-yulora-theme-surface={surface}
      data-yulora-theme-scene={descriptor.sceneId}
      data-yulora-theme-surface-mode={mode}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="theme-surface-canvas"
      />
    </div>
  );
}
