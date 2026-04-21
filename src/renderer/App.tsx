import { Suspense, lazy } from "react";

import { resolveRuntimeMode } from "./runtime-mode";

const EditorApp = lazy(() => import("./editor/App"));
const canRenderWorkbench = import.meta.env.DEV || import.meta.env.MODE === "test";
const WorkbenchApp = canRenderWorkbench ? lazy(() => import("./workbench/App")) : null;

export default function App() {
  const runtimeMode = resolveRuntimeMode({
    search: window.location.search,
    bridgeMode: window.fishmark?.runtimeMode
  });
  const shouldRenderWorkbench =
    canRenderWorkbench && runtimeMode === "test-workbench" && WorkbenchApp;

  return (
    <Suspense fallback={null}>
      {shouldRenderWorkbench ? <WorkbenchApp /> : <EditorApp />}
    </Suspense>
  );
}
