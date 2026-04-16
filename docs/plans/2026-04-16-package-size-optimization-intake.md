# 2026-04-16 Package Size Optimization Intake

## Goal

Shrink the Windows installer and packaged app footprint without changing editor behavior.

## Scope

- Trim bundled Electron locales to the current supported UI languages.
- Stop packaging avoidable build artifacts such as declaration files and CLI source maps.
- Reclassify renderer-only libraries so they are available for build/test but not copied into the packaged runtime.
- Update packaging documentation to describe the new packaging boundaries.

## Constraints

- Do not touch Electron/Chromium runtime DLLs, ICU data, or GPU-related files.
- Do not change renderer, main, preload, or CLI behavior.
- Keep the diff focused on packaging config, dependency metadata, tests, and packaging docs.

## Verification

- `npm.cmd test -- src/main/package-scripts.test.ts`
- `npm.cmd run build`
- `npm.cmd run package:win`
- Compare `release/Yulora-Setup-0.1.0.exe` and `release/win-unpacked` size before/after.
