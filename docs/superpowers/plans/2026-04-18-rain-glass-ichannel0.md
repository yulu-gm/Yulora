# Rain Glass `iChannel0` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimal `iChannel0` image-texture support to theme fragment surfaces so `Rain Glass` can refract a realistic outdoor scene plate instead of a procedural gradient.

**Architecture:** Extend the shared theme-package manifest contract with an optional image-only `channels.0`, then thread that descriptor through the renderer surface host into the WebGL runtime. The runtime keeps the existing fragment-surface model, but adds a single image-backed sampler path that injects `iResolution`, `iTime`, and `iChannel0` only when needed. The bundled `Rain Glass` theme then uses a generated outdoor scene texture plus a refraction-oriented shader to approximate the reference Shadertoy wet-glass effect.

**Tech Stack:** Electron, React 19, TypeScript, WebGL 1, Vite, Vitest, local theme package assets

---

## File Structure

**Shared contract**
- Modify: `src/shared/theme-package.ts`
- Test: `src/shared/theme-package.test.ts`

**Renderer shader runtime**
- Modify: `src/renderer/shader/theme-surface-runtime.ts`
- Test: `src/renderer/shader/theme-surface-runtime.test.ts`
- Modify: `src/renderer/editor/ThemeSurfaceHost.tsx`
- Test: `src/renderer/editor/ThemeSurfaceHost.test.tsx`

**Renderer app integration**
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/app.autosave.test.ts`

**Theme package assets**
- Modify: `fixtures/themes/rain-glass/manifest.json`
- Create: `fixtures/themes/rain-glass/assets/textures/rain-window-scene.png`
- Modify: `fixtures/themes/rain-glass/shaders/workbench-background.glsl`
- Modify: `fixtures/themes/rain-glass/shaders/titlebar-backdrop.glsl`
- Modify: `fixtures/themes/rain-glass/styles/ui.css`

**Verification helpers**
- Modify: `scripts/sync-dev-themes.mjs` only if the new asset path is not already copied by the existing recursive sync

## Task 1: Extend The Theme-Package Contract With `channels.0`

**Files:**
- Modify: `src/shared/theme-package.ts`
- Test: `src/shared/theme-package.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

```ts
// src/shared/theme-package.test.ts
it("keeps image channel paths inside the package root", () => {
  const manifest = normalizeThemePackageManifest(
    {
      id: "rain-glass",
      name: "Rain Glass",
      version: "1.0.0",
      supports: { light: true, dark: true },
      scene: { id: "rain-scene", sharedUniforms: { rainAmount: 0.7 } },
      surfaces: {
        workbenchBackground: {
          kind: "fragment",
          scene: "rain-scene",
          shader: "./shaders/workbench-background.glsl",
          channels: {
            0: {
              type: "image",
              src: "./assets/textures/rain-window-scene.png"
            }
          }
        }
      }
    },
    "/tmp/rain-glass"
  );

  expect(manifest?.surfaces.workbenchBackground).toMatchObject({
    channels: {
      0: {
        type: "image",
        src: "/tmp/rain-glass/assets/textures/rain-window-scene.png"
      }
    }
  });
});

it("drops unsupported surface channels", () => {
  const manifest = normalizeThemePackageManifest(
    {
      id: "rain-glass",
      name: "Rain Glass",
      version: "1.0.0",
      supports: { light: true, dark: true },
      scene: { id: "rain-scene", sharedUniforms: {} },
      surfaces: {
        workbenchBackground: {
          kind: "fragment",
          scene: "rain-scene",
          shader: "./shaders/workbench-background.glsl",
          channels: {
            0: {
              type: "buffer",
              src: "./assets/textures/rain-window-scene.png"
            },
            1: {
              type: "image",
              src: "./assets/textures/extra.png"
            }
          }
        }
      }
    },
    "/tmp/rain-glass"
  );

  expect(manifest?.surfaces.workbenchBackground?.channels ?? {}).toEqual({});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/shared/theme-package.test.ts`

Expected: FAIL because `ThemeSurfaceDescriptor` does not define `channels` and the normalizer does not preserve image channel descriptors.

- [ ] **Step 3: Add the minimal image-channel types and normalization**

```ts
// src/shared/theme-package.ts
export type ThemeSurfaceChannelSlot = "0";

export type ThemeSurfaceChannelDescriptor = {
  type: "image";
  src: string;
};

export type ThemeSurfaceDescriptor = {
  kind: "fragment";
  scene: string;
  shader: string;
  channels: Partial<Record<ThemeSurfaceChannelSlot, ThemeSurfaceChannelDescriptor>>;
};

const THEME_SURFACE_CHANNEL_SLOTS = ["0"] as const;

function normalizeSurfaceChannels(
  raw: unknown,
  packageRoot: string
): Partial<Record<ThemeSurfaceChannelSlot, ThemeSurfaceChannelDescriptor>> {
  const source = isRecord(raw) ? raw : {};

  return THEME_SURFACE_CHANNEL_SLOTS.reduce<
    Partial<Record<ThemeSurfaceChannelSlot, ThemeSurfaceChannelDescriptor>>
  >((channels, slot) => {
    const candidate = source[slot];

    if (!isRecord(candidate) || candidate.type !== "image") {
      return channels;
    }

    const src = normalizePackagePath(candidate.src, packageRoot);

    if (!src) {
      return channels;
    }

    channels[slot] = {
      type: "image",
      src
    };

    return channels;
  }, {});
}

function normalizeSurfaceDescriptor(
  raw: unknown,
  packageRoot: string
): ThemeSurfaceDescriptor | null {
  // existing kind / scene / shader checks
  return {
    kind: "fragment",
    scene,
    shader,
    channels: normalizeSurfaceChannels(raw.channels, packageRoot)
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/shared/theme-package.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/theme-package.ts src/shared/theme-package.test.ts
git commit -m "feat: add theme image channel contract"
```

## Task 2: Add Single-Texture `iChannel0` Support To The WebGL Runtime

**Files:**
- Modify: `src/renderer/shader/theme-surface-runtime.ts`
- Test: `src/renderer/shader/theme-surface-runtime.test.ts`

- [ ] **Step 1: Write the failing runtime tests**

```ts
// src/renderer/shader/theme-surface-runtime.test.ts
it("injects iResolution, iTime, and iChannel0 only when a channel texture is declared", () => {
  const source = buildFragmentShaderSource(
    "void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = texture2D(iChannel0, fragCoord.xy); }",
    [],
    true
  );

  expect(source).toContain("uniform vec3 iResolution;");
  expect(source).toContain("uniform float iTime;");
  expect(source).toContain("uniform sampler2D iChannel0;");
});

it("binds an image channel to texture unit 0 before rendering", async () => {
  const bindTexture = vi.fn();
  const activeTexture = vi.fn();
  const uniform1i = vi.fn();

  const runtime = createThemeSurfaceRuntime({
    createPresenter: ({ channelTextures }) => ({
      render: () => {
        activeTexture(channelTextures[0]?.unit);
        bindTexture(channelTextures[0]?.target, channelTextures[0]?.texture);
        uniform1i(channelTextures[0]?.location, 0);
      },
      destroy: vi.fn()
    }),
    loadImageTexture: vi.fn().mockResolvedValue({
      unit: 33984,
      target: 3553,
      texture: { id: "texture-0" },
      location: { id: "location-0" }
    })
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
    }),
    channels: {
      0: { type: "image", src: "yulora-asset://preview?path=/tmp/rain-window-scene.png" }
    }
  });

  expect(result.mode).toBe("full");
  expect(bindTexture).toHaveBeenCalled();
  expect(uniform1i).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/renderer/shader/theme-surface-runtime.test.ts`

Expected: FAIL because `buildFragmentShaderSource` does not accept a texture-channel flag and `mount` does not accept `channels`.

- [ ] **Step 3: Extend the runtime input, uniform injection, and texture loading**

```ts
// src/renderer/shader/theme-surface-runtime.ts
type ThemeSurfaceRuntimeChannelDescriptor = {
  type: "image";
  src: string;
};

export type MountThemeSurfaceInput = {
  canvas: HTMLCanvasElement | null;
  surface: ThemeSurfaceSlot;
  shaderSource: string | null;
  effectsMode: ThemeEffectsMode;
  sceneState: ThemeSceneState;
  channels?: Partial<Record<"0", ThemeSurfaceRuntimeChannelDescriptor>>;
};

export function buildFragmentShaderSource(
  shaderSource: string,
  uniformKeys: readonly string[],
  hasImageChannel0 = false
): string {
  const trimmed = shaderSource.trim();

  const header = [
    /\bprecision\s+(?:lowp|mediump|highp)\s+float\s*;/u.test(trimmed) ? null : "precision mediump float;",
    hasUniformDeclaration(trimmed, "u_resolution") ? null : "uniform vec2 u_resolution;",
    hasUniformDeclaration(trimmed, "u_time") ? null : "uniform float u_time;",
    hasUniformDeclaration(trimmed, "iResolution") ? null : "uniform vec3 iResolution;",
    hasUniformDeclaration(trimmed, "iTime") ? null : "uniform float iTime;",
    hasImageChannel0 && !hasUniformDeclaration(trimmed, "iChannel0")
      ? "uniform sampler2D iChannel0;"
      : null,
    ...uniformKeys.map((key, index) => {
      const uniformName = sanitizeUniformKey(key, index);
      return hasUniformDeclaration(trimmed, uniformName) ? null : `uniform float ${uniformName};`;
    })
  ].filter((line): line is string => line !== null);

  if (/\bvoid\s+mainImage\s*\(/u.test(trimmed)) {
    return `${header.join("\n")}\n${trimmed}\nvoid main() {\n  vec4 yuloraColor = vec4(0.0);\n  mainImage(yuloraColor, gl_FragCoord.xy);\n  gl_FragColor = yuloraColor;\n}`;
  }

  return `${header.join("\n")}\n${trimmed}`;
}

async function loadImageChannel0(gl: WebGLRenderingContext, src: string) {
  const image = await loadImage(src);
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to allocate channel texture.");
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  return texture;
}
```

- [ ] **Step 4: Bind the sampler during render and keep fallback safe**

```ts
// src/renderer/shader/theme-surface-runtime.ts
const channelTexture0 =
  input.channels?.["0"]?.type === "image"
    ? await loadImageChannel0(gl, input.channels["0"].src)
    : null;
const channel0Uniform = channelTexture0 ? gl.getUniformLocation(program, "iChannel0") : null;
const resolution3Uniform = gl.getUniformLocation(program, "iResolution");
const timeAliasUniform = gl.getUniformLocation(program, "iTime");

return {
  render(frame) {
    if (resolutionUniform) {
      gl.uniform2f(resolutionUniform, input.canvas.width, input.canvas.height);
    }

    if (resolution3Uniform) {
      gl.uniform3f(resolution3Uniform, input.canvas.width, input.canvas.height, 1.0);
    }

    if (timeUniform) {
      gl.uniform1f(timeUniform, frame.time);
    }

    if (timeAliasUniform) {
      gl.uniform1f(timeAliasUniform, frame.time);
    }

    if (channelTexture0 && channel0Uniform) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, channelTexture0);
      gl.uniform1i(channel0Uniform, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  },
  destroy() {
    if (channelTexture0) {
      gl.deleteTexture(channelTexture0);
    }
    gl.deleteBuffer(quadBuffer);
    gl.deleteProgram(program);
  }
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/renderer/shader/theme-surface-runtime.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/shader/theme-surface-runtime.ts src/renderer/shader/theme-surface-runtime.test.ts
git commit -m "feat: add ichannel0 image support to theme surfaces"
```

## Task 3: Thread Channel Descriptors Through The Renderer Surface Host

**Files:**
- Modify: `src/renderer/editor/ThemeSurfaceHost.tsx`
- Test: `src/renderer/editor/ThemeSurfaceHost.test.tsx`
- Modify: `src/renderer/editor/App.tsx`
- Modify: `src/renderer/app.autosave.test.ts`

- [ ] **Step 1: Write the failing integration tests**

```ts
// src/renderer/editor/ThemeSurfaceHost.test.tsx
it("passes image channel descriptors through to the surface runtime", async () => {
  const mount = vi.fn().mockResolvedValue({
    mode: "full",
    unmount: vi.fn()
  });

  render(
    <ThemeSurfaceHost
      surface="workbenchBackground"
      descriptor={{
        kind: "fragment",
        sceneId: "rain-scene",
        shaderUrl: "yulora-asset://preview?path=/tmp/workbench-background.glsl",
        sharedUniforms: {},
        channels: {
          0: {
            type: "image",
            src: "yulora-asset://preview?path=/tmp/rain-window-scene.png"
          }
        }
      }}
      effectsMode="auto"
    />
  );

  expect(mount).toHaveBeenCalledWith(
    expect.objectContaining({
      channels: {
        0: {
          type: "image",
          src: "yulora-asset://preview?path=/tmp/rain-window-scene.png"
        }
      }
    })
  );
});

// src/renderer/app.autosave.test.ts
expect(surfaceHost).not.toBeNull();
expect(surfaceHost?.parentElement?.classList.contains("app-layout")).toBe(true);
expect(fetchMock).toHaveBeenCalledWith(
  "yulora-asset://preview?path=%2Ftmp%2Fyulora%2Fthemes%2Frain-glass%2Fshaders%2Fworkbench-background.glsl",
  expect.any(Object)
);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/renderer/editor/ThemeSurfaceHost.test.tsx src/renderer/app.autosave.test.ts`

Expected: FAIL because the surface descriptor does not carry channels through to the runtime.

- [ ] **Step 3: Extend the surface descriptor and resolver**

```ts
// src/renderer/editor/ThemeSurfaceHost.tsx
export type ThemeSurfaceHostDescriptor = {
  kind: "fragment";
  sceneId: string;
  shaderUrl: string;
  sharedUniforms: Record<string, number>;
  channels: Partial<Record<"0", { type: "image"; src: string }>>;
};

// src/renderer/editor/App.tsx
return {
  kind: "fragment",
  sceneId: scene.id,
  shaderUrl: createPreviewAssetUrl(fragmentSurface.shader),
  sharedUniforms: scene.sharedUniforms,
  channels: fragmentSurface.channels
    ? Object.fromEntries(
        Object.entries(fragmentSurface.channels).map(([slot, channel]) => [
          slot,
          {
            type: channel.type,
            src: createPreviewAssetUrl(channel.src)
          }
        ])
      )
    : {}
};
```

- [ ] **Step 4: Pass channels into the runtime mount call**

```ts
// src/renderer/editor/ThemeSurfaceHost.tsx
const result = await runtimeRef.current.mount({
  canvas: canvasRef.current,
  surface,
  shaderSource,
  effectsMode,
  sceneState,
  channels: descriptor.channels
});
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/renderer/editor/ThemeSurfaceHost.test.tsx src/renderer/app.autosave.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/editor/ThemeSurfaceHost.tsx src/renderer/editor/App.tsx src/renderer/editor/ThemeSurfaceHost.test.tsx src/renderer/app.autosave.test.ts
git commit -m "feat: thread image channels into workbench surfaces"
```

## Task 4: Add The Rain Glass Scene Plate And Refraction Shader

**Files:**
- Create: `fixtures/themes/rain-glass/assets/textures/rain-window-scene.png`
- Modify: `fixtures/themes/rain-glass/manifest.json`
- Modify: `fixtures/themes/rain-glass/shaders/workbench-background.glsl`
- Modify: `fixtures/themes/rain-glass/shaders/titlebar-backdrop.glsl`
- Modify: `fixtures/themes/rain-glass/styles/ui.css`

- [ ] **Step 1: Create the outdoor scene texture**

Create `fixtures/themes/rain-glass/assets/textures/rain-window-scene.png` with these characteristics:

```text
Subject: overcast exterior plate seen through a window
Foreground: soft tree silhouettes
Midground: muted building massing
Palette: cool blue-gray
Contrast: medium-low
Detail: enough edges and tonal variation to refract well
No strong subject centered in frame
```

Use the image-generation workflow to produce the asset at a workbench-friendly size such as `1600x1000` or `1920x1200`.

- [ ] **Step 2: Update the Rain Glass manifest to declare channel 0**

```json
// fixtures/themes/rain-glass/manifest.json
{
  "surfaces": {
    "workbenchBackground": {
      "kind": "fragment",
      "scene": "rain-scene",
      "shader": "./shaders/workbench-background.glsl",
      "channels": {
        "0": {
          "type": "image",
          "src": "./assets/textures/rain-window-scene.png"
        }
      }
    },
    "titlebarBackdrop": {
      "kind": "fragment",
      "scene": "rain-scene",
      "shader": "./shaders/titlebar-backdrop.glsl"
    }
  }
}
```

- [ ] **Step 3: Replace the workbench shader with an `iChannel0` refraction version**

```glsl
// fixtures/themes/rain-glass/shaders/workbench-background.glsl
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_rainAmount;
uniform float u_glassBlur;
uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;

#define S(a, b, t) smoothstep(a, b, t)

vec3 N13(float p) { /* ported noise body */ }
float N(float t) { /* ported scalar noise body */ }
float Saw(float edge, float t) { return S(0.0, edge, t) * S(1.0, edge, t); }
vec2 DropLayer(vec2 uv, float t) { /* adapted Heartfelt moving-drop body */ }
float StaticDrops(vec2 uv, float t) { /* adapted Heartfelt static-drop body */ }
vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) { /* combined layers */ }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
  vec2 screenUv = fragCoord.xy / iResolution.xy;
  float rainAmount = clamp(0.25 + u_rainAmount * 0.9, 0.0, 1.0);
  float blurAmount = clamp(u_glassBlur, 0.0, 1.0);
  float t = iTime * 0.22;

  float staticDrops = S(-0.5, 1.0, rainAmount) * 1.7;
  float layerOne = S(0.22, 0.72, rainAmount);
  float layerTwo = S(0.0, 0.5, rainAmount);

  vec2 drops = Drops(uv * 1.04, t, staticDrops, layerOne, layerTwo);
  vec2 e = vec2(0.002, 0.0);
  float cx = Drops(uv * 1.04 + e, t, staticDrops, layerOne, layerTwo).x;
  float cy = Drops(uv * 1.04 + e.yx, t, staticDrops, layerOne, layerTwo).x;
  vec2 n = vec2(cx - drops.x, cy - drops.x);

  float focus = mix(4.2 + blurAmount * 2.0, 1.6, S(0.08, 0.22, drops.x));
  vec2 refractedUv = screenUv + n * (0.08 + rainAmount * 0.05);
  vec3 base = texture2D(iChannel0, refractedUv).rgb;
  vec3 blurA = texture2D(iChannel0, refractedUv + vec2(focus, 0.0) / iResolution.xy).rgb;
  vec3 blurB = texture2D(iChannel0, refractedUv - vec2(0.0, focus) / iResolution.xy).rgb;
  vec3 color = mix(base, (base + blurA + blurB) / 3.0, clamp(0.2 + blurAmount * 0.45 + drops.y * 0.2, 0.0, 0.85));

  vec3 fogColor = mix(vec3(0.79, 0.84, 0.9), vec3(0.58, 0.67, 0.77), screenUv.y);
  color = mix(color, fogColor, clamp(0.18 + (1.0 - drops.x) * 0.18 + blurAmount * 0.24, 0.0, 0.78));

  fragColor = vec4(color, 0.52 + blurAmount * 0.16 + drops.x * 0.08);
}
```

- [ ] **Step 4: Keep the titlebar visually aligned but lighter-weight**

```glsl
// fixtures/themes/rain-glass/shaders/titlebar-backdrop.glsl
// Keep the existing single-pass titlebar shader, but bias its palette and fog
// toward the new scene plate so the titlebar reads as part of the same weather system.
```

```css
/* fixtures/themes/rain-glass/styles/ui.css */
.app-rail {
  background: color-mix(in srgb, var(--yulora-glass-strong-bg) 46%, transparent);
  border-right-color: color-mix(in srgb, var(--yulora-glass-border) 72%, transparent);
  backdrop-filter: blur(20px) saturate(1.12);
}

.workspace-header {
  background: color-mix(in srgb, var(--yulora-glass-bg) 36%, transparent);
  border-radius: 20px;
  backdrop-filter: blur(16px) saturate(1.08);
}
```

- [ ] **Step 5: Sync the dev theme fixtures and verify the texture ships**

Run: `node scripts/sync-dev-themes.mjs`

Expected: PASS with the new texture copied under `~/Library/Application Support/Yulora-dev/themes/rain-glass/assets/textures/`.

- [ ] **Step 6: Commit**

```bash
git add fixtures/themes/rain-glass/manifest.json fixtures/themes/rain-glass/assets/textures/rain-window-scene.png fixtures/themes/rain-glass/shaders/workbench-background.glsl fixtures/themes/rain-glass/shaders/titlebar-backdrop.glsl fixtures/themes/rain-glass/styles/ui.css
git commit -m "feat: add rain glass ichannel0 scene plate"
```

## Task 5: Full Verification And Manual Acceptance

**Files:**
- No new files
- Verify all touched files from Tasks 1-4

- [ ] **Step 1: Run focused automated verification**

Run:

```bash
npm test -- src/shared/theme-package.test.ts \
  src/renderer/shader/theme-surface-runtime.test.ts \
  src/renderer/editor/ThemeSurfaceHost.test.tsx \
  src/renderer/app.autosave.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Launch the dev app and visually inspect Rain Glass**

Run: `/Users/chenglinwu/Documents/Yulora/tools/dev-app.sh`

Verify:

- `Rain Glass` remains selectable
- workbench rain effect visibly refracts the outdoor scene plate
- trails and droplet normals distort the image, not just a flat gradient
- rail and workspace remain covered by the same dynamic background layer
- fallback warning does not appear during normal startup

- [ ] **Step 4: Record the acceptance summary**

Write a short note for the final handoff covering:

- contract added: `channels.0`
- runtime added: `iChannel0`
- sample updated: outdoor scene plate + refraction shader
- verification run: focused tests + typecheck + manual visual check

- [ ] **Step 5: Commit any final follow-up adjustments**

```bash
git add -A
git commit -m "test: verify rain glass ichannel0 support"
```

## Self-Review

- Spec coverage:
  - Theme contract: Task 1
  - Runtime texture channel + uniforms: Task 2
  - Renderer threading/integration: Task 3
  - Rain Glass asset + shader update: Task 4
  - Verification and manual acceptance: Task 5
- Placeholder scan:
  - No `TODO`/`TBD` markers remain
  - The only intentionally open-ended item is the generated image asset, but its visual requirements are explicitly specified
- Type consistency:
  - `channels.0` is consistently used across manifest, host descriptor, runtime input, and tests
  - `iChannel0` is the only sampler in scope for this plan
