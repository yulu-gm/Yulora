# 2026-04-16 Package Size Optimization Handoff

## What Changed

- Added a packaging regression test to lock the expected package-size guardrails.
- Trimmed packaged Electron locales to `en-US`, `zh-CN`, and `zh-TW`.
- Excluded generated declaration files under `dist-electron/` and source maps under `dist-cli/` from packaged output.
- Reclassified renderer-only libraries (`react`, `react-dom`, `@codemirror/*`, `micromark`) as build-time dependencies so they are bundled by Vite instead of copied into packaged runtime `node_modules`.
- Documented the new packaging guardrails in [docs/packaging.md](/C:/Users/yulu/Documents/Yulora/Yulora/docs/packaging.md).

## Touched Files

- [src/main/package-scripts.test.ts](/C:/Users/yulu/Documents/Yulora/Yulora/src/main/package-scripts.test.ts)
- [electron-builder.json](/C:/Users/yulu/Documents/Yulora/Yulora/electron-builder.json)
- [package.json](/C:/Users/yulu/Documents/Yulora/Yulora/package.json)
- [package-lock.json](/C:/Users/yulu/Documents/Yulora/Yulora/package-lock.json)
- [docs/packaging.md](/C:/Users/yulu/Documents/Yulora/Yulora/docs/packaging.md)
- [docs/plans/2026-04-16-package-size-optimization-intake.md](/C:/Users/yulu/Documents/Yulora/Yulora/docs/plans/2026-04-16-package-size-optimization-intake.md)

## Verification Commands

- `npm.cmd test -- src/main/package-scripts.test.ts`
- `npm.cmd run build`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run package:win`

## Size Results

- Installer: `96.26 MB -> 87.63 MB` (`-8.63 MB`)
- `win-unpacked`: `354.33 MB -> 299.30 MB` (`-55.03 MB`)
- `resources/app.asar`: `10.90 MB -> 0.63 MB` (`-10.27 MB`)
- `locales/`: `46.36 MB -> 1.61 MB` (`-44.75 MB`)

## Manual Acceptance Notes

- Install the generated `release/Yulora-Setup-0.1.0.exe`.
- Launch the packaged app and confirm the main window opens normally.
- Open, edit, and save a Markdown file to confirm packaging-only changes did not affect editor behavior.
- On an English or Chinese system locale, spot-check that Electron-native chrome still shows the expected language.
- On any other system locale, confirm the app still launches and Electron-native chrome falls back cleanly.

## Known Risks / Follow-Ups

- Users whose OS language is not in the kept Electron locale list will see Electron-native chrome fall back instead of using a localized shell. Document content editing is unaffected.
- The renderer bundle is still a single large chunk (`~535 KB` minified); this change removed duplicated runtime payload but did not yet do code-splitting.
- `MVP_BACKLOG.md`, `docs/progress.md`, and `reports/task-summaries/` were not updated because this packaging optimization is not mapped to a tracked backlog task slice.
