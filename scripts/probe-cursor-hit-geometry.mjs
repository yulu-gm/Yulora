import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { createServer } from "vite";

const require = createRequire(import.meta.url);
const electronBinary = require("electron");
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const port = Number(process.env.FISHMARK_CURSOR_HIT_GEOMETRY_PROBE_PORT ?? "5192");

const server = await createServer({
  configFile: resolve(projectRoot, "vite.config.ts"),
  server: {
    host: "localhost",
    port,
    strictPort: true
  },
  logLevel: "silent"
});

await server.listen();

const child = spawn(
  electronBinary,
  [resolve(projectRoot, "scripts/electron-cursor-hit-geometry-main.cjs")],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      FISHMARK_CURSOR_HIT_GEOMETRY_PROBE_URL: `http://localhost:${port}/cursor-hit-geometry-probe.html`
    },
    stdio: "inherit"
  }
);

const exitCode = await new Promise((resolveExit) => {
  child.on("exit", (code) => resolveExit(code ?? 1));
  child.on("error", () => resolveExit(1));
});

await server.close();
process.exit(exitCode);
