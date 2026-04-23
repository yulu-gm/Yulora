export const PRELOAD_BRIDGE_MODE_ARGUMENT_PREFIX = "--fishmark-preload-bridge-mode=";

export type PreloadBridgeMode = "product" | "editor-test" | "test-workbench";

export function resolvePreloadBridgeModeFromArgv(input: {
  argv: string[];
  fallbackMode: "editor" | "test-workbench";
}): PreloadBridgeMode {
  const bridgeArgument = input.argv.find((entry) =>
    entry.startsWith(PRELOAD_BRIDGE_MODE_ARGUMENT_PREFIX)
  );
  const bridgeValue = bridgeArgument?.slice(PRELOAD_BRIDGE_MODE_ARGUMENT_PREFIX.length);

  if (bridgeValue === "editor-test" || bridgeValue === "test-workbench") {
    return bridgeValue;
  }

  return input.fallbackMode === "test-workbench" ? "test-workbench" : "product";
}
