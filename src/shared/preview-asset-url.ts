export const PREVIEW_ASSET_PROTOCOL = "yulora-asset";
export const PREVIEW_ASSET_HOST = "preview";

export function createPreviewAssetUrl(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return `${PREVIEW_ASSET_PROTOCOL}://${PREVIEW_ASSET_HOST}?path=${encodeURIComponent(normalizedPath)}`;
}
