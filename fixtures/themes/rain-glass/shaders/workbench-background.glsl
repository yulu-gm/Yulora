// Rain-on-glass for the workbench background.
// Close port of the "Heartfelt" drop logic by Martijn Steinrucken (BigWings, 2017)
// – https://www.shadertoy.com/view/ltffzl – with WebGL1-friendly blur emulation
// replacing the original textureLod mipmap lookup.
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_rainAmount;
uniform float u_glassBlur;
uniform float u_enableLightning;
uniform float u_enableZoomWobble;
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

// Falling drops with long trails (faithful to the reference DropLayer2).
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
  float wiggle = sin(y + sin(y));
  x += wiggle * (0.5 - abs(x)) * (n.z - 0.5);
  x *= 0.7;

  float ti = fract(t + n.z);
  y = (Saw(0.85, ti) - 0.5) * 0.9 + 0.5;
  vec2 p = vec2(x, y);

  // Elongated teardrop shape (length on (1, 6) axes).
  float d = length((st - p) * a.yx);
  float mainDrop = S(0.4, 0.0, d);

  float r = sqrt(S(1.0, y, st.y));
  float cd = abs(st.x - x);
  float trail = S(0.23 * r, 0.15 * r * r, cd);
  float trailFront = S(-0.02, 0.02, st.y - y);
  trail *= trailFront * r * r;

  // Droplet beads left in the trail wake.
  y = UV.y;
  y = fract(y * 10.0) + (st.y - 0.5);
  float dd = length(st - vec2(x, y));
  float droplets = S(0.3, 0.0, dd);

  float m = mainDrop + droplets * r * trailFront;
  return vec2(m, trail);
}

// Dense static micro-droplets that twinkle in place.
float StaticDrops(vec2 uv, float t) {
  uv *= 40.0;
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

// Flip Y so (0,0) lands on the top-left in screen terms to match iChannel0 upload.
vec2 sceneUv(vec2 uv) {
  return vec2(uv.x, 1.0 - uv.y);
}

// WebGL1-friendly approximation of textureLod's mip blur.
// `focus` is a virtual mip level in roughly 0..8.
vec3 sampleScene(vec2 uv, float focus) {
  // Convert virtual mip to UV radius. Mip 6 ~ 0.036 UV (about 1/28 of the image).
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
  c += texture2D(iChannel0, sceneUv(uv + vec2(dg.x, -dg.y))).rgb;
  c += texture2D(iChannel0, sceneUv(uv - vec2(dg.x, -dg.y))).rgb;

  // Wider ring for the fogged areas.
  float r2 = r * 2.1;
  vec2 rx2 = vec2(r2, 0.0);
  vec2 ry2 = vec2(0.0, r2);
  c += texture2D(iChannel0, sceneUv(uv + rx2)).rgb * 0.5;
  c += texture2D(iChannel0, sceneUv(uv - rx2)).rgb * 0.5;
  c += texture2D(iChannel0, sceneUv(uv + ry2)).rgb * 0.5;
  c += texture2D(iChannel0, sceneUv(uv - ry2)).rgb * 0.5;

  return c / 12.0; // 2 + 8 + 4*0.5
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 resolution = resolveResolution();
  float T = resolveTime();

  vec2 uv = (fragCoord - 0.5 * resolution) / resolution.y;
  vec2 UV = fragCoord / resolution;

  float rainAmount = clamp(u_rainAmount, 0.0, 1.0);
  float blurAmount = clamp(u_glassBlur, 0.0, 1.0);
  float t = T * 0.2;

  // Gentle breathing zoom so the scene is never perfectly static.
  float zoomEnabled = clamp(u_enableZoomWobble, 0.0, 1.0);
  float zoom = -cos(T * 0.2) * zoomEnabled;
  uv *= 0.72 + zoom * 0.22;
  UV = (UV - 0.5) * (0.92 + zoom * 0.08) + 0.5;

  // Blur range (mapped to virtual mip levels). Glass blur slider widens it.
  float maxBlur = mix(3.2, 6.0, rainAmount) + blurAmount * 1.5;
  float minBlur = 1.6 + blurAmount * 0.6;

  float staticDrops = S(-0.5, 1.0, rainAmount) * 2.0;
  float layer1 = S(0.25, 0.75, rainAmount);
  float layer2 = S(0.0, 0.5, rainAmount);

  vec2 c = Drops(uv, t, staticDrops, layer1, layer2);

  // Finite-difference normal on the raw drop field – this is what gives drops
  // their lens-like refraction.
  vec2 e = vec2(0.001, 0.0);
  float cx = Drops(uv + e, t, staticDrops, layer1, layer2).x;
  float cy = Drops(uv + e.yx, t, staticDrops, layer1, layer2).x;
  vec2 n = vec2(cx - c.x, cy - c.x);

  // Drops sharpen focus (min blur), fog regions stay at max blur, trails cut
  // a less-foggy streak (c.y subtracts from max blur).
  float focus = mix(maxBlur - c.y * 0.8, minBlur, S(0.1, 0.2, c.x));

  vec3 col = sampleScene(UV + n, focus);

  // Subtle cool color grade that cycles slowly, matching the reference post.
  float tp = (T + 3.0) * 0.5;
  float colFade = sin(tp * 0.2) * 0.5 + 0.5;
  float gradeStrength = clamp(u_colorGradeStrength, 0.0, 1.0);
  col *= mix(vec3(1.0), vec3(0.82, 0.92, 1.28), colFade * gradeStrength);

  // Lightning flicker (gated).
  float fade = S(0.0, 10.0, T);
  float lightningEnabled = clamp(u_enableLightning, 0.0, 1.0);
  float lightning = sin(tp * sin(tp * 10.0));
  lightning *= pow(max(0.0, sin(tp + sin(tp))), 10.0);
  col *= 1.0 + lightning * fade * 0.55 * lightningEnabled;

  // Vignette.
  vec2 v = UV - 0.5;
  col *= 1.0 - dot(v, v) * 0.9;

  col *= fade;

  // Alpha stays opaque so the workbench scene reads through the glass.
  fragColor = vec4(col, 1.0);
}
