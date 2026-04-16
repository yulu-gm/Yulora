import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("package scripts", () => {
  it("waits for the shared Electron build output before launching the app in dev", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["dev:electron"]).toContain(
      "dist-electron/shared/open-markdown-file.js"
    );
    expect(packageJson.scripts?.["dev:electron"]).toContain(
      "dist-electron/shared/save-markdown-file.js"
    );
  });

  it("defines a dedicated dev entry for the test workbench mode", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["dev:test-workbench"]).toContain("npm:dev:electron:test-workbench");
    expect(packageJson.scripts?.["dev:test-workbench"]).toContain("npm:dev:renderer:test-workbench");
    expect(packageJson.scripts?.["dev:renderer:test-workbench"]).toContain("--port 5174");
    expect(packageJson.scripts?.["dev:electron:test-workbench"]).toContain(
      "YULORA_START_MODE=test-workbench"
    );
    expect(packageJson.scripts?.["dev:electron:test-workbench"]).toContain(
      "VITE_DEV_SERVER_URL=http://localhost:5174"
    );
  });

  it("uses cross-env via npm bin resolution instead of a hard-coded node_modules path", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["dev:electron"]).toContain("cross-env VITE_DEV_SERVER_URL=http://localhost:5173");
    expect(packageJson.scripts?.["dev:electron"]).not.toContain("node ./node_modules/cross-env/");
    expect(packageJson.scripts?.["dev:electron:test-workbench"]).toContain(
      "cross-env YULORA_START_MODE=test-workbench VITE_DEV_SERVER_URL=http://localhost:5174"
    );
    expect(packageJson.scripts?.["dev:electron:test-workbench"]).not.toContain(
      "node ./node_modules/cross-env/"
    );
  });

  it("lets vite derive the dev port from the environment", () => {
    const viteConfigPath = path.join(process.cwd(), "vite.config.ts");
    const viteConfigSource = readFileSync(viteConfigPath, "utf8");

    expect(viteConfigSource).toContain("YULORA_DEV_SERVER_PORT");
  });

  it("uses relative asset URLs for the renderer build output", () => {
    const viteConfigPath = path.join(process.cwd(), "vite.config.ts");
    const viteConfigSource = readFileSync(viteConfigPath, "utf8");

    expect(viteConfigSource).toContain('base: "./"');
  });

  it("does not import local shared modules from the preload source", () => {
    const preloadPath = path.join(process.cwd(), "src", "preload", "preload.ts");
    const preloadSource = readFileSync(preloadPath, "utf8");

    expect(preloadSource).not.toContain("from \"./");
    expect(preloadSource).not.toContain("from './");
    expect(preloadSource).not.toContain("from \"../");
    expect(preloadSource).not.toContain("from '../");
  });

  it("defines a Windows packaging entry that builds before invoking electron-builder", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["package:win"]).toContain("npm run build");
    expect(packageJson.scripts?.["package:win"]).toContain("npm run generate:icons");
    expect(packageJson.scripts?.["package:win"]).toContain("electron-builder");
    expect(packageJson.scripts?.["package:win"]).toContain("--config electron-builder.json");
    expect(packageJson.scripts?.["package:win"]).toContain("--win");
    expect(packageJson.scripts?.["package:win"]).toContain("--x64");
  });

  it("defines a dedicated icon generation script", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["generate:icons"]).toBe("node scripts/generate-icons.mjs");
  });

  it("stores the Windows installer configuration in a dedicated electron-builder config file", () => {
    const configPath = path.join(process.cwd(), "electron-builder.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      appId?: string;
      afterPack?: string;
      electronLanguages?: string[];
      productName?: string;
      directories?: { output?: string };
      files?: string[];
      extraResources?: Array<
        | string
        | {
            from?: string;
            to?: string;
            filter?: string[];
          }
      >;
      win?: {
        icon?: string;
        signAndEditExecutable?: boolean;
        target?: Array<{
          target?: string;
          arch?: string[];
        }>;
      };
      nsis?: {
        oneClick?: boolean;
        allowToChangeInstallationDirectory?: boolean;
      };
    };

    expect(config.appId).toBe("com.yulora.app");
    expect(config.afterPack).toBe("./scripts/after-pack-win-icon.mjs");
    expect(config.electronLanguages).toEqual(["en-US", "zh-CN", "zh-TW"]);
    expect(config.productName).toBe("Yulora");
    expect(config.directories?.output).toBe("release");
    expect(config.files).toEqual(
      expect.arrayContaining([
        "dist/**/*",
        "dist-electron/**/*",
        "dist-cli/**/*",
        "!dist-electron/**/*.d.ts",
        "!dist-cli/**/*.map",
        "!src{,/**}",
        "!tests{,/**}",
        "!docs{,/**}",
        "!reports{,/**}"
      ])
    );
    expect(config.extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "build/icons",
          to: "icons"
        })
      ])
    );
    expect(config.win?.icon).toBe("build/icons/light/icon.ico");
    expect(config.win?.target).toEqual([
      {
        target: "nsis",
        arch: ["x64"]
      }
    ]);
    expect(config.win?.signAndEditExecutable).toBe(false);
    expect(config.nsis).toMatchObject({
      oneClick: false,
      allowToChangeInstallationDirectory: true
    });
  });

  it("keeps renderer libraries as build-time dependencies instead of packaged runtime dependencies", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies ?? {}).toEqual({});
    expect(packageJson.devDependencies).toEqual(
      expect.objectContaining({
        "@codemirror/commands": expect.any(String),
        "@codemirror/state": expect.any(String),
        "@codemirror/view": expect.any(String),
        "micromark": expect.any(String),
        "react": expect.any(String),
        "react-dom": expect.any(String)
      })
    );
  });

  it("ignores the release output directory", () => {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    const gitignoreSource = readFileSync(gitignorePath, "utf8");

    expect(gitignoreSource).toContain("release");
  });

  it("provides a Windows batch entry for packaging from the repo root", () => {
    const batchPath = path.join(process.cwd(), "package-win.bat");
    const batchSource = readFileSync(batchPath, "utf8");

    expect(batchSource).toContain("@echo off");
    expect(batchSource).toContain('cd /d "%~dp0"');
    expect(batchSource).toContain("call npm.cmd run package:win");
  });

  it("provides a macOS shell entry that reserves the packaging flow with a clear message", () => {
    const shellPath = path.join(process.cwd(), "package-macos.sh");
    const shellSource = readFileSync(shellPath, "utf8");

    expect(shellSource).toContain("#!/usr/bin/env bash");
    expect(shellSource).toContain('cd "$(dirname "$0")"');
    expect(shellSource).toContain('if [[ "$(uname)" != "Darwin" ]]');
    expect(shellSource).toContain("macOS packaging is not implemented yet");
    expect(shellSource).toContain("exit 1");
  });
});
