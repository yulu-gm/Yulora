import { Suspense, lazy } from "react";

import { resolveRuntimeMode } from "./runtime-mode";

const EditorApp = lazy(() => import("./editor/App"));
const WorkbenchApp = lazy(() => import("./workbench/App"));

export default function App() {
  const runtimeMode = resolveRuntimeMode({
    search: window.location.search,
    bridgeMode: window.yulora?.runtimeMode
  });

  return (
    <Suspense fallback={null}>
      {runtimeMode === "test-workbench" ? <WorkbenchApp /> : <EditorApp />}
    </Suspense>
  );
}
