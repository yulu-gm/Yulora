import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";

import { showOpenMarkdownDialog } from "./open-markdown-file";
import { resolveRendererEntry } from "./paths";
import { OPEN_MARKDOWN_FILE_CHANNEL } from "../shared/open-markdown-file";

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const rendererEntry = resolveRendererEntry(
    path.join(__dirname, "../../dist"),
    process.env.VITE_DEV_SERVER_URL
  );

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(rendererEntry);
  } else {
    void window.loadFile(rendererEntry);
  }

  window.once("ready-to-show", () => {
    window.show();
  });

  return window;
}

app.whenReady().then(() => {
  ipcMain.handle(OPEN_MARKDOWN_FILE_CHANNEL, async () => showOpenMarkdownDialog());

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
