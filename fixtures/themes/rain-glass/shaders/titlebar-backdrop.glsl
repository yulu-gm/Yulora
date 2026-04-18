// Lighter titlebar variant of the rain-on-glass effect. Shares the drop logic
// with the workbench background but uses a cheaper blur approximation and
// slightly softer grading so the titlebar stays legible.
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_rainAmount;
uniform float u_glassBlur;
uniform float u_colorGradeStrength;
uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;

#define S(a, b, t) smoothstep(a, b, t)

vec3 N13(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3(
    (p3.x + p3.y) * p3.z,
    (p3.x + p3.z) * p3.y,
    (p3.y + p3.z) * p3.x
  ));
}

float N(float t) {
  return fract(sin(t * 12345.564) * 7658.76);
}

float Saw(float b, float t) {
  return S(0.0, b, t) * S(1.0, b, t);
}

vec2 resolveResolution() {
  return iResolution.x > 0.0 ? iResolution.xy : u_resolution;
}

float resolveTime() {
  return iTime > 0.0 ? iTime : u_time;
}

vec2 DropLayer2(vec2 uv, float t) {
  vec2 UV = uv;
  uv.y += t * 0.75;
  vec2 a = vec2(6.0, 1.0);
  vec2 grid = a * 2.0;
  vec2 id = floor(uv * grid);

  float colShift = N(id.x);
  uv.y += colShift;

  id = floor(uv * grid);
  vec3 n = N13(id.x * 35.2 + id.y * 2376.1);
  vec2 st = fract(uv * grid) - vec2(0.5, 0.0);

  float x = n.x - 0.5;
  float y = UV.y * 20.0;
  x += sin(y + sin(y)) * (0.5 - abs(x)) * (n.z - 0.5);
  x *= 0.7;

  float ti = fract(t + n.z);
  y = (Saw(0.85, ti) - 0.5) * 0.9 + 0.5;

  float d = length((st - vec2(x, y)) * a.yx);
  float mainDrop = S(0.4, 0.0, d);

  float r = sqrt(S(1.0, y, st.y));
  float cd = abs(st.x - x);
  float trail = S(0.23 * r, 0.15 * r * r, cd);
  trail *= S(-0.02, 0.02, st.y - y) * r * r;

  return vec2(mainDrop, trail);
}

float StaticDrops(vec2 uv, float t) {
  uv *= 34.0;
  vec2 id = floor(uv);
  uv = fract(uv) - 0.5;
  vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
  vec2 p = (n.xy - 0.5) * 0.7;
  float d = length(uv - p);
  float fade = Saw(0.025, fract(t + n.z));
  return S(0.3, 0.0, d) * fract(n.z * 10.0) * fade;
}

vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
  float s = StaticDrops(uv, t) * l0;
  vec2 m1 = DropLayer2(uv, t) * l1;
  vec2 m2 = DropLayer2(uv * 1.85, t) * l2;
  float c = s + m1.x + m2.x;
  c = S(0.3, 1.0, c);
  return vec2(c, max(m1.y * l0, m2.y * l1));
}

vec2 sceneUv(vec2 uv) {
  return vec2(uv.x, 1.0 - uv.y);
}

// Lighter 7-tap blur – titlebar is a narrow strip so we don't need a second ring.
vec3 sampleScene(vec2 uv, float focus) {
  float r = focus * 0.006;
  vec2 uv0 = sceneUv(uv);

  vec3 c = texture2D(iChannel0, uv0).rgb * 2.0;
  vec2 rx = vec2(r, 0.0);
  vec2 ry = vec2(0.0, r);
  c += texture2D(iChannel0, sceneUv(uv + rx)).rgb;
  c += texture2D(iChannel0, sceneUv(uv - rx)).rgb;
  c += texture2D(iChannel0, sceneUv(uv + ry)).rgb;
  c += texture2D(iChannel0, sceneUv(uv - ry)).rgb;
  vec2 dg = vec2(r, r) * 0.7071;
  c += texture2D(iChannel0, sceneUv(uv + dg)).rgb;
  c += texture2D(iChannel0, sceneUv(uv - dg)).rgb;

  return c / 8.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 resolution = resolveResolution();
  float T = resolveTime();

  vec2 uv = (fragCoord - 0.5 * resolution) / resolution.y;
  vec2 UV = fragCoord / resolution;

  float rainAmount = clamp(u_rainAmount, 0.0, 1.0);
  float blurAmount = clamp(u_glassBlur, 0.0, 1.0);
  float t = T * 0.2;

  // Titlebar should feel a little more blurred than the workbench backdrop
  // (the scene behind the chrome reads as "further" than the editor view).
  float maxBlur = mix(3.8, 6.4, rainAmount) + blurAmount * 1.6;
  float minBlur = 2.2 + blurAmount * 0.6;

  float staticDrops = S(-0.5, 1.0, rainAmount) * 2.0;
  float layer1 = S(0.25, 0.75, rainAmount);
  float layer2 = S(0.0, 0.5, rainAmount);

  // Scale up drops slightly because the titlebar strip is narrow – this keeps
  // drops from looking stretched across the bar.
  vec2 scaledUv = uv * 1.35;
  vec2 c = Drops(scaledUv, t, staticDrops, layer1, layer2);

  vec2 e = vec2(0.001, 0.0);
  float cx = Drops(scaledUv + e, t, staticDrops, layer1, layer2).x;
  float cy = Drops(scaledUv + e.yx, t, staticDrops, layer1, layer2).x;
  vec2 n = vec2(cx - c.x, cy - c.x);

  float focus = mix(maxBlur - c.y * 0.8, minBlur, S(0.1, 0.2, c.x));
  vec3 col = sampleScene(UV + n, focus);

  // Cool grade, slightly lifted so the titlebar doesn't get too dark.
  float tp = (T + 3.0) * 0.5;
  float colFade = sin(tp * 0.2) * 0.5 + 0.5;
  float gradeStrength = clamp(u_colorGradeStrength, 0.0, 1.0);
  col *= mix(vec3(1.0), vec3(0.86, 0.94, 1.22), colFade * gradeStrength * 0.88);
  col = col * 1.04 + vec3(0.02, 0.025, 0.03);

  // Light vignette biased to horizontal so titlebar edges fade gently.
  vec2 v = UV - 0.5;
  col *= 1.0 - v.x * v.x * 0.55 - v.y * v.y * 0.35;

  float alpha = 0.72 + 0.12 * blurAmount + 0.06 * c.x;
  fragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
