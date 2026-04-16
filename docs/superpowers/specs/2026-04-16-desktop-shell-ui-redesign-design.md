# Yulora Desktop Shell UI Redesign

Date: 2026-04-16
Scope: renderer shell, shared UI tokens, settings drawer presentation, supporting docs

## Goal

Move Yulora's interface closer to "Notion order + Typora immersion":

- quieter and more desktop-native
- fewer competing chrome layers
- stable, highly readable writing surface
- glass only in overlay surfaces such as drawers and floating panels
- layout driven by a reusable design system instead of ad-hoc spacing fixes

## Problems To Solve

The current shell already has the right primitives, but they feel assembled rather than designed as one system:

- duplicate brand and document metadata create too much chrome before writing begins
- the left rail mixes decorative placeholders with actual controls
- the main shell depends on hard-coded offsets and height compensation
- panel radius, shadows, blur, spacing, and borders are mostly component-local values
- the settings drawer still behaves like a page sliding from the edge instead of a floating desktop sheet
- the editor area is strong on its own, but surrounding UI draws too much attention

## Approved Direction

### 1. Shell Structure

Keep the app shell model, but simplify it:

- retain a narrow left rail for brand presence and utility entry points
- remove placeholder workspace/outline pills until those surfaces are real
- turn the top area into a lightweight utility header instead of a second brand block
- keep the document editor centered and dominant
- keep status information persistent, but calmer and structurally integrated

### 2. Visual System

Introduce reusable UI tokens for:

- spacing
- radius
- border weights
- elevation
- glass fill / scrim / blur
- shell widths and gutters

The editor surface remains solid and readable. Glass is restricted to overlay surfaces such as the settings drawer.

### 3. Settings Drawer

The preferences surface becomes a floating drawer:

- positioned away from the screen edge, offset from the rail
- overlaid on top of the workspace instead of pushing it
- backed by a scrim
- rendered as one coherent surface, not a drawer containing stacked mini-cards
- using a thin sticky header, calm footer, and consistent form rows

### 4. Interaction Model

- opening preferences must keep the editor mounted
- closing preferences restores focus to the editor or trigger as appropriate
- opening preferences must not shift, blur, or compress the editor canvas
- keyboard dismissal continues to work with Escape

## Implementation Boundaries

This redesign is intentionally scoped:

- no new navigation features
- no new workspace / outline behavior
- no theme system replacement
- no editor behavior changes
- no new dependencies

The work is limited to shell structure, styling primitives, and settings presentation.

## Files Expected To Change

- `src/renderer/editor/App.tsx`
- `src/renderer/app.autosave.test.ts`
- `src/renderer/styles/base.css`
- `src/renderer/styles/app-ui.css`
- `src/renderer/styles/settings.css`
- `src/renderer/styles/themes/default-light/tokens.css`
- `src/renderer/styles/themes/default-dark/tokens.css`
- `src/renderer/styles/themes/default-light/ui.css`
- `docs/design.md`

## Validation

The redesign is complete only when:

- renderer tests cover the updated shell and settings structure
- build passes
- lint passes
- typecheck passes
- tests pass
- docs reflect the new shell model
