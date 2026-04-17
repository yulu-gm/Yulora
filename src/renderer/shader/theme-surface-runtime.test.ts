// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { createThemeSceneState } from "./theme-scene-state";
import { createThemeSurfaceRuntime } from "./theme-surface-runtime";

type TestCanvas = HTMLCanvasElement & {
  __setSize: (width: number, height: number) => void;
};

function createCanvas(width = 640, height = 360): TestCanvas {
  const canvas = document.createElement("canvas");
  let currentWidth = width;
  let currentHeight = height;

  Object.defineProperty(canvas, "clientWidth", {
    configurable: true,
    get: () => currentWidth
  });
  Object.defineProperty(canvas, "clientHeight", {
    configurable: true,
    get: () => currentHeight
  });

  canvas.getBoundingClientRect = () =>
    ({
      width: currentWidth,
      height: currentHeight,
      top: 0,
      left: 0,
      right: currentWidth,
      bottom: currentHeight,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }) as DOMRect;

  return Object.assign(canvas, {
    __setSize(width: number, height: number) {
      currentWidth = width;
      currentHeight = height;
    }
  });
}

describe("theme surface runtime", () => {
  it("falls back immediately when effects are disabled", async () => {
    const createPresenter = vi.fn();
    const runtime = createThemeSurfaceRuntime({ createPresenter });

    const result = await runtime.mount({
      canvas: createCanvas(),
      surface: "workbenchBackground",
      shaderSource: "void main() { gl_FragColor = vec4(1.0); }",
      effectsMode: "off",
      sceneState: createThemeSceneState({
        sceneId: "rain-scene",
        effectsMode: "off",
        sharedUniforms: {}
      })
    });

    expect(result.mode).toBe("fallback");
    expect(createPresenter).not.toHaveBeenCalled();
  });

  it("uses a reduced one-shot render path for auto mode", async () => {
    const render = vi.fn();
    const destroy = vi.fn();
    const requestAnimationFrame = vi.fn();
    const runtime = createThemeSurfaceRuntime({
      requestAnimationFrame,
      createPresenter: () => ({
        render,
        destroy
      })
    });

    const result = await runtime.mount({
      canvas: createCanvas(320, 200),
      surface: "workbenchBackground",
      shaderSource: "void main() { gl_FragColor = vec4(1.0); }",
      effectsMode: "auto",
      sceneState: createThemeSceneState({
        sceneId: "rain-scene",
        effectsMode: "auto",
        sharedUniforms: { rainAmount: 0.7 }
      })
    });

    expect(result.mode).toBe("reduced");
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "workbenchBackground",
        viewport: { width: 320, height: 200 },
        uniforms: { rainAmount: 0.7 }
      })
    );
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    result.unmount();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("redraws reduced surfaces when the canvas size changes", async () => {
    const render = vi.fn();
    const destroy = vi.fn();
    const observedTargets: Element[] = [];
    let triggerResize!: () => void;
    let disconnected = false;
    class FakeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        triggerResize = () => callback([] as ResizeObserverEntry[], {} as ResizeObserver);
      }

      observe(target: Element) {
        observedTargets.push(target);
      }

      disconnect() {
        disconnected = true;
      }
    }

    const runtime = createThemeSurfaceRuntime({
      ResizeObserver: FakeResizeObserver as typeof ResizeObserver,
      createPresenter: () => ({
        render,
        destroy
      })
    });
    const canvas = createCanvas(320, 200);
    const result = await runtime.mount({
      canvas,
      surface: "workbenchBackground",
      shaderSource: "void main() { gl_FragColor = vec4(1.0); }",
      effectsMode: "auto",
      sceneState: createThemeSceneState({
        sceneId: "rain-scene",
        effectsMode: "auto",
        sharedUniforms: {}
      })
    });

    expect(result.mode).toBe("reduced");
    expect(render).toHaveBeenCalledTimes(1);
    expect(observedTargets).toEqual([canvas]);

    canvas.__setSize(640, 400);
    triggerResize();

    expect(render).toHaveBeenCalledTimes(2);
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(400);

    result.unmount();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(disconnected).toBe(true);
  });

  it("starts an animation loop in full mode and tears it down cleanly", async () => {
    const render = vi.fn();
    const destroy = vi.fn();
    const scheduledFrames: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      scheduledFrames.push(callback);
      return scheduledFrames.length;
    });
    const cancelAnimationFrame = vi.fn();
    const runtime = createThemeSurfaceRuntime({
      requestAnimationFrame,
      cancelAnimationFrame,
      createPresenter: () => ({
        render,
        destroy
      })
    });

    const result = await runtime.mount({
      canvas: createCanvas(),
      surface: "workbenchBackground",
      shaderSource: "void main() { gl_FragColor = vec4(1.0); }",
      effectsMode: "full",
      sceneState: createThemeSceneState({
        sceneId: "rain-scene",
        effectsMode: "full",
        sharedUniforms: {}
      })
    });

    expect(result.mode).toBe("full");
    expect(render).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    scheduledFrames[0]?.(16);

    expect(render).toHaveBeenCalledTimes(2);

    result.unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("falls back when presenter creation fails", async () => {
    const runtime = createThemeSurfaceRuntime({
      createPresenter: () => {
        throw new Error("shader compile failed");
      }
    });

    const result = await runtime.mount({
      canvas: createCanvas(),
      surface: "workbenchBackground",
      shaderSource: "void main() { gl_FragColor = vec4(1.0); }",
      effectsMode: "auto",
      sceneState: createThemeSceneState({
        sceneId: "rain-scene",
        effectsMode: "auto",
        sharedUniforms: {}
      })
    });

    expect(result.mode).toBe("fallback");
  });
});
