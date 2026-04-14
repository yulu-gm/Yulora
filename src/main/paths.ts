import path from "node:path";

export function resolveRendererEntry(distDir: string, devServerUrl?: string): string {
  if (devServerUrl) {
    return devServerUrl;
  }

  return path.join(distDir, "index.html");
}
