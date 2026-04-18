# Rain Glass Workspace Opacity Parameter Design

## Context

`Rain Glass` already exposes theme parameters through the existing settings UI.

Today that parameter pipeline only affects shader uniforms:

- theme parameters are declared in the theme manifest
- settings UI renders sliders and toggles for the active theme
- user overrides are stored in preferences
- renderer applies those overrides to shader uniforms

The current workspace glass shell is pure CSS, so there is no way to tune its translucency from the same theme parameter UI.

## Goal

Add a `Rain Glass` theme parameter that directly controls the workspace glass shell opacity from the existing theme parameter UI.

The user should be able to adjust how transparent or solid the integrated workspace glass area feels without introducing a new preferences surface.

## Non-Goals

- No new standalone preferences UI
- No new parameter type beyond the existing slider
- No change to shader runtime behavior except preserving current parameter support
- No global redesign of all theme CSS parameter handling

## User Outcome

After this change:

- `Rain Glass` shows a slider for workspace glass opacity
- moving the slider updates the workspace glass shell transparency
- the value persists through the existing theme parameter preferences flow

## Approach

Bridge active theme parameter overrides into CSS variables on the document root.

Recommended implementation:

- add a new slider parameter in `rain-glass/manifest.json`, for example `workspaceGlassOpacity`
- keep storing the value through the existing `preferences.theme.parameters` path
- in the renderer, map active theme parameter values to root-level CSS variables such as `--yulora-theme-parameter-workspaceGlassOpacity`
- in `rain-glass/styles/ui.css`, use that CSS variable when building the workspace shell background and related translucency

This keeps the current settings panel and preferences model intact while extending theme parameters from shader-only control into CSS styling.

## CSS Contract

The renderer should expose active theme parameter values as CSS custom properties on the document root for the active theme only.

For this change, `Rain Glass` needs:

- `--yulora-theme-parameter-workspaceGlassOpacity`

The CSS should provide a fallback value matching the current visual default so the theme still renders correctly when no override exists.

## Files In Scope

- `fixtures/themes/rain-glass/manifest.json`
- `fixtures/themes/rain-glass/styles/ui.css`
- `src/renderer/editor/App.tsx`
- relevant renderer tests for theme parameter application and UI persistence

## Validation

Manual or automated validation should confirm:

- the new slider appears in the active theme parameter panel
- changing the slider updates workspace glass transparency
- the chosen value persists in preferences
- existing shader parameter behavior still works
