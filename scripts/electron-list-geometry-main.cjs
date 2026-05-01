const { app, BrowserWindow } = require("electron");

async function main() {
  const url = process.env.FISHMARK_LIST_GEOMETRY_PROBE_URL;
  if (!url) {
    throw new Error("FISHMARK_LIST_GEOMETRY_PROBE_URL is required.");
  }

  await app.whenReady();

  const window = new BrowserWindow({
    width: 420,
    height: 360,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await window.loadURL(url);
  const result = await window.webContents.executeJavaScript(
    "window.__runFishmarkListGeometryProbe()",
    true
  );

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  window.close();
  app.exit(result.pass ? 0 : 1);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  app.exit(1);
});
