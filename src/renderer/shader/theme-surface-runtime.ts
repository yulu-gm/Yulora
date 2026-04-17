import type { ThemeEffectsMode, ThemeSurfaceSlot } from "../../shared/theme-package";
import type { ThemeSceneFrame, ThemeSceneState, ThemeSceneViewport } from "./theme-scene-state";

export type ThemeSurfaceRuntimeMode = "full" | "reduced" | "fallback";

export type ThemeSurfacePresenter = {
  render: (frame: ThemeSceneFrame) => void;
  destroy: () => void;
};

export type ThemeSurfacePresenterFactory = (input: {
  canvas: HTMLCanvasElement;
  shaderSource: string;
  uniformKeys: readonly string[];
}) => ThemeSurfacePresenter;

export type MountThemeSurfaceInput = {
  canvas: HTMLCanvasElement | null;
  surface: ThemeSurfaceSlot;
  shaderSource: string | null;
  effectsMode: ThemeEffectsMode;
  sceneState: ThemeSceneState;
};

export type MountedThemeSurface = {
  mode: ThemeSurfaceRuntimeMode;
  unmount: () => void;
};

type ThemeSurfaceRuntimeDependencies = {
  createPresenter?: ThemeSurfacePresenterFactory;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
  ResizeObserver?: typeof ResizeObserver;
};

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

function resolveRenderMode(effectsMode: ThemeEffectsMode): ThemeSurfaceRuntimeMode {
  if (effectsMode === "off") {
    return "fallback";
  }

  return effectsMode === "full" ? "full" : "reduced";
}

function getViewport(canvas: HTMLCanvasElement): ThemeSceneViewport {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.clientWidth || canvas.width;
  const height = rect.height || canvas.clientHeight || canvas.height;

  return {
    width: Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0,
    height: Number.isFinite(height) ? Math.max(0, Math.round(height)) : 0
  };
}

function syncCanvasSize(canvas: HTMLCanvasElement, viewport: ThemeSceneViewport): void {
  const devicePixelRatio =
    typeof globalThis.window?.devicePixelRatio === "number" ? globalThis.window.devicePixelRatio : 1;
  const nextWidth = Math.max(1, Math.round(viewport.width * Math.max(1, devicePixelRatio)));
  const nextHeight = Math.max(1, Math.round(viewport.height * Math.max(1, devicePixelRatio)));

  if (canvas.width !== nextWidth) {
    canvas.width = nextWidth;
  }

  if (canvas.height !== nextHeight) {
    canvas.height = nextHeight;
  }
}

function createFallbackMount(): MountedThemeSurface {
  return {
    mode: "fallback",
    unmount() {}
  };
}

function sanitizeUniformKey(key: string, index: number): string {
  const stripped = key.trim().replace(/[^A-Za-z0-9_]/gu, "_");
  const prefixed = /^[A-Za-z_]/u.test(stripped) ? stripped : `shared_${index}`;
  return `u_${prefixed}`;
}

function buildFragmentShaderSource(shaderSource: string, uniformKeys: readonly string[]): string {
  const trimmed = shaderSource.trim();

  if (trimmed.length === 0) {
    throw new Error("Shader source is empty.");
  }

  const header = [
    /\bprecision\s+(?:lowp|mediump|highp)\s+float\s*;/u.test(trimmed) ? null : "precision mediump float;",
    "uniform vec2 u_resolution;",
    "uniform float u_time;",
    ...uniformKeys.map((key, index) => `uniform float ${sanitizeUniformKey(key, index)};`)
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  if (/\bvoid\s+mainImage\s*\(/u.test(trimmed)) {
    return `${header}\n${trimmed}\nvoid main() {\n  vec4 yuloraColor = vec4(0.0);\n  mainImage(yuloraColor, gl_FragCoord.xy);\n  gl_FragColor = yuloraColor;\n}`;
  }

  return `${header}\n${trimmed}`;
}

function getWebGlContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
  const contextAttributes: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: false
  };
  const context =
    canvas.getContext("webgl", contextAttributes) ??
    canvas.getContext("experimental-webgl", contextAttributes);

  if (!(context instanceof WebGLRenderingContext)) {
    throw new Error("WebGL is unavailable.");
  }

  return context;
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Failed to allocate shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
    const message = gl.getShaderInfoLog(shader) ?? "Shader compilation failed.";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Failed to allocate shader program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    const message = gl.getProgramInfoLog(program) ?? "Shader link failed.";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function createDefaultPresenter(input: {
  canvas: HTMLCanvasElement;
  shaderSource: string;
  uniformKeys: readonly string[];
}): ThemeSurfacePresenter {
  const gl = getWebGlContext(input.canvas);
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    buildFragmentShaderSource(input.shaderSource, input.uniformKeys)
  );
  const program = createProgram(gl, vertexShader, fragmentShader);
  const positionAttribute = gl.getAttribLocation(program, "a_position");
  const resolutionUniform = gl.getUniformLocation(program, "u_resolution");
  const timeUniform = gl.getUniformLocation(program, "u_time");
  const sharedUniformLocations = new Map<string, WebGLUniformLocation | null>(
    input.uniformKeys.map((key, index) => [key, gl.getUniformLocation(program, sanitizeUniformKey(key, index))])
  );
  const quadBuffer = gl.createBuffer();

  if (!quadBuffer) {
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("Failed to allocate geometry buffer.");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1
    ]),
    gl.STATIC_DRAW
  );

  gl.useProgram(program);
  gl.enableVertexAttribArray(positionAttribute);
  gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0, 0, 0, 0);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return {
    render(frame) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(positionAttribute);
      gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, input.canvas.width, input.canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (resolutionUniform) {
        gl.uniform2f(resolutionUniform, input.canvas.width, input.canvas.height);
      }

      if (timeUniform) {
        gl.uniform1f(timeUniform, frame.time);
      }

      for (const [key, location] of sharedUniformLocations) {
        if (!location) {
          continue;
        }

        gl.uniform1f(location, frame.uniforms[key] ?? 0);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    destroy() {
      gl.deleteBuffer(quadBuffer);
      gl.deleteProgram(program);
    }
  };
}

export function createThemeSurfaceRuntime(
  dependencies: ThemeSurfaceRuntimeDependencies = {}
): {
  mount: (input: MountThemeSurfaceInput) => Promise<MountedThemeSurface>;
} {
  const createPresenter = dependencies.createPresenter ?? createDefaultPresenter;
  const requestAnimationFrameImpl =
    dependencies.requestAnimationFrame ?? globalThis.requestAnimationFrame?.bind(globalThis);
  const cancelAnimationFrameImpl =
    dependencies.cancelAnimationFrame ?? globalThis.cancelAnimationFrame?.bind(globalThis);
  const ResizeObserverImpl = dependencies.ResizeObserver ?? globalThis.ResizeObserver;

  async function mount(input: MountThemeSurfaceInput): Promise<MountedThemeSurface> {
    const mode = resolveRenderMode(input.effectsMode);

    if (mode === "fallback" || !(input.canvas instanceof HTMLCanvasElement)) {
      return createFallbackMount();
    }

    const canvas = input.canvas;

    const shaderSource = input.shaderSource?.trim() ?? "";

    if (shaderSource.length === 0) {
      return createFallbackMount();
    }

    let presenter: ThemeSurfacePresenter;

    try {
      presenter = createPresenter({
        canvas,
        shaderSource,
        uniformKeys: input.sceneState.sharedUniformKeys
      });
    } catch {
      return createFallbackMount();
    }

    let isUnmounted = false;
    let frameHandle: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const renderFrame = (): void => {
      if (isUnmounted) {
        return;
      }

      const viewport = getViewport(canvas);

      if (viewport.width > 0 && viewport.height > 0) {
        syncCanvasSize(canvas, viewport);
        presenter.render(input.sceneState.nextFrame(input.surface, viewport));
      }

      if (mode === "full" && requestAnimationFrameImpl) {
        frameHandle = requestAnimationFrameImpl(() => {
          renderFrame();
        });
      }
    };

    renderFrame();

    if (mode === "reduced" && typeof ResizeObserverImpl === "function") {
      resizeObserver = new ResizeObserverImpl(() => {
        renderFrame();
      });
      resizeObserver.observe(canvas);
    }

    return {
      mode,
      unmount() {
        if (isUnmounted) {
          return;
        }

        isUnmounted = true;

        if (frameHandle !== null && cancelAnimationFrameImpl) {
          cancelAnimationFrameImpl(frameHandle);
          frameHandle = null;
        }

        resizeObserver?.disconnect();
        resizeObserver = null;
        presenter.destroy();
      }
    };
  }

  return {
    mount
  };
}
