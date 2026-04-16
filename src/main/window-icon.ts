import path from "node:path";

import { app } from "electron";

export function resolveWindowIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icons", "light", "icon.ico");
  }

  return path.join(__dirname, "../../build/icons/light/icon.ico");
}
