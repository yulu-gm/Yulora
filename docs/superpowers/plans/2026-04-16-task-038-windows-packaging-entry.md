# TASK-038 Windows Packaging Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Windows packaging entry that builds the current Electron app into an installable `.exe` without changing the existing dev/build workflow.

**Architecture:** Keep the existing `npm run build` pipeline as the only place that compiles renderer, main/preload, and CLI outputs. Layer a new `package:win` script on top of that build, store the `electron-builder` settings in a dedicated root config file, and constrain the packaged file set to runtime artifacts plus production dependencies only. Record the new workflow in packaging docs and task status docs without marking the whole cross-platform packaging epic complete.

**Tech Stack:** Electron, TypeScript, Vitest, electron-builder, NSIS

---

### Task 1: Lock the Windows packaging contract with failing tests

**Files:**
- Modify: `src/main/package-scripts.test.ts`
- Create: `electron-builder.json`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing tests for the packaging script, builder config, and ignored output**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("package scripts", () => {
  it("defines a Windows packaging entry that builds before invoking electron-builder", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["package:win"]).toContain("npm run build");
    expect(packageJson.scripts?.["package:win"]).toContain("electron-builder");
    expect(packageJson.scripts?.["package:win"]).toContain("--config electron-builder.json");
    expect(packageJson.scripts?.["package:win"]).toContain("--win");
    expect(packageJson.scripts?.["package:win"]).toContain("--x64");
  });

  it("stores the Windows installer configuration in a dedicated electron-builder config file", () => {
    const configPath = path.join(process.cwd(), "electron-builder.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      appId?: string;
      productName?: string;
      directories?: { output?: string };
      files?: string[];
      win?: {
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
    expect(config.productName).toBe("Yulora");
    expect(config.directories?.output).toBe("release");
    expect(config.files).toEqual(
      expect.arrayContaining([
        "dist/**/*",
        "dist-electron/**/*",
        "dist-cli/**/*",
        "!src{,/**}",
        "!tests{,/**}",
        "!docs{,/**}",
        "!reports{,/**}"
      ])
    );
    expect(config.win?.target).toEqual([
      {
        target: "nsis",
        arch: ["x64"]
      }
    ]);
    expect(config.nsis).toMatchObject({
      oneClick: false,
      allowToChangeInstallationDirectory: true
    });
  });

  it("ignores the release output directory", () => {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    const gitignoreSource = readFileSync(gitignorePath, "utf8");

    expect(gitignoreSource).toContain("release");
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm.cmd test -- src/main/package-scripts.test.ts`
Expected: FAIL because `package:win`, `electron-builder.json`, and `release` ignore rule do not exist yet

- [ ] **Step 3: Install `electron-builder` as a dev dependency**

Run: `npm.cmd install --save-dev electron-builder`
Expected: `package.json` and `package-lock.json` gain the new dev dependency without unrelated package churn

- [ ] **Step 4: Add the minimal packaging script, config, and ignored output**

```json
{
  "scripts": {
    "package:win": "npm run build && electron-builder --config electron-builder.json --win --x64"
  },
  "devDependencies": {
    "electron-builder": "^26.8.1"
  }
}
```

```json
{
  "appId": "com.yulora.app",
  "productName": "Yulora",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "dist-cli/**/*",
    "!src{,/**}",
    "!tests{,/**}",
    "!docs{,/**}",
    "!reports{,/**}",
    "!.artifacts{,/**}",
    "!fixtures{,/**}",
    "!tmp{,/**}"
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

```gitignore
release
```

- [ ] **Step 5: Re-run the focused test to verify it passes**

Run: `npm.cmd test -- src/main/package-scripts.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the packaging entry**

```bash
git add src/main/package-scripts.test.ts package.json package-lock.json electron-builder.json .gitignore
git commit -m "feat: add windows packaging entry"
```

### Task 2: Document the local `.exe` workflow and record partial task progress honestly

**Files:**
- Create: `docs/packaging.md`
- Modify: `MVP_BACKLOG.md`
- Modify: `docs/progress.md`
- Modify: `docs/decision-log.md`

- [ ] **Step 1: Re-read the current TASK-038 backlog and progress entries before editing**

Run:
- `Select-String -Path MVP_BACKLOG.md -Pattern "TASK-038" -Context 0,24`
- `Select-String -Path docs/progress.md -Pattern "TASK-038" -Context 0,2`

Expected: Confirm `TASK-038` is still `TODO` and currently describes the full cross-platform scope

- [ ] **Step 2: Add the packaging guide**

```md
# Yulora Packaging

## Windows local packaging

The current repository supports a local Windows packaging flow that produces an installable `.exe` via NSIS.

### Prerequisites

- Windows
- `npm ci` or `npm install`

### Build the installer

```bash
npm run package:win
```

### Output

The generated installer is written to:

```text
release/
```

### Current limitations

- This task currently covers Windows local packaging only.
- macOS packaging is still part of the remaining `TASK-038` scope.
- Code signing is not configured yet.
- Auto-update is not configured yet.
- If no custom icon assets are added later, the installer will continue to use the default Electron icon.
```

- [ ] **Step 3: Update backlog, progress, and decision log for the Windows-only slice**

```md
### TASK-038 跨平台打包

状态：开发中

执行切片：
- [x] 选择打包方案并接入 Windows 本地构建脚本
- [ ] 配置两个平台的产物元信息与图标
- [ ] 在各平台上完成一次冒烟安装与启动
- [x] 在文档中记录签名 / 自动更新的未来接入点
```

```md
| TASK-038 | 跨平台打包 | DEV_IN_PROGRESS | 已接入基于 `electron-builder` 的 Windows 本地 `package:win` 打包入口，可在当前仓库内生成 NSIS `.exe`；macOS 产物、签名和正式图标仍待后续切片完成。 |
```

```md
| 2026-04-16 | `TASK-038` 保持现有 `npm run build` 作为唯一编译入口，只额外叠加 `package:win` 脚本和独立 `electron-builder.json` 配置来生成 Windows NSIS 安装器。 | 这样可以把“构建应用”和“打包分发”边界分开，复用现有 renderer / electron / cli 产物，同时用显式 `files` 白名单避免把源码、测试和文档打入安装包。 | 当前只交付 Windows x64 本地 `.exe`；macOS 产物、签名和自动更新仍留在 `TASK-038` 后续切片。 |
```

- [ ] **Step 4: Run a quick doc sanity check**

Run:
- `Select-String -Path docs/packaging.md,MVP_BACKLOG.md,docs/progress.md,docs/decision-log.md -Pattern "TODO|TBD"`
- `Select-String -Path docs/packaging.md -Pattern "package:win|release|code signing|Auto-update|macOS"`

Expected:
- No placeholder markers
- Packaging doc mentions the command, output directory, and limitations

- [ ] **Step 5: Commit the documentation and task-status updates**

```bash
git add docs/packaging.md MVP_BACKLOG.md docs/progress.md docs/decision-log.md
git commit -m "docs: record windows packaging workflow"
```

### Task 3: Verify the packaging flow end-to-end and record the evidence

**Files:**
- Modify: `docs/test-report.md`

- [ ] **Step 1: Run the full repository verification gates**

Run:
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`

Expected:
- All commands PASS before the packaging run

- [ ] **Step 2: Run the Windows packaging command**

Run: `npm.cmd run package:win`
Expected:
- PASS
- `release/` contains an NSIS installer `.exe`

- [ ] **Step 3: Confirm the generated installer exists**

Run: `Get-ChildItem release -Filter *.exe | Select-Object -ExpandProperty Name`
Expected: At least one `.exe` filename is printed

- [ ] **Step 4: Append the verification evidence to the task test report**

```md
| 2026-04-16 | TASK-038 | `npm run test -- src/main/package-scripts.test.ts` | 通过 | 覆盖 `package:win` 入口、`electron-builder.json` 配置以及 `release/` 忽略规则。 |
| 2026-04-16 | TASK-038 | `npm run lint` | 通过 | 打包脚本、builder 配置和文档更新未引入 lint 错误。 |
| 2026-04-16 | TASK-038 | `npm run typecheck` | 通过 | 现有 Electron / renderer / vitest / cli TypeScript 检查保持通过。 |
| 2026-04-16 | TASK-038 | `npm run test` | 通过 | Vitest 全量测试通过，包含新增打包配置回归测试。 |
| 2026-04-16 | TASK-038 | `npm run build` | 通过 | 现有构建链路保持通过，确认 `package:win` 依赖的基础构建未回归。 |
| 2026-04-16 | TASK-038 | `npm run package:win` | 通过 | 本地 Windows 打包成功，`release/` 目录生成 NSIS 安装器 `.exe`。 |
```

- [ ] **Step 5: Commit the verification record**

```bash
git add docs/test-report.md
git commit -m "test: record windows packaging verification"
```
