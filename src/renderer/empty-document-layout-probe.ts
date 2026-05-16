import "./styles/base.css";
import "./styles/primitives.css";
import "./styles/app-ui.css";
import "./styles/editor-source.css";
import "./styles/markdown-render.css";

import { createCodeEditorController } from "./code-editor";

type SerializableRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type EmptyDocumentLayoutProbeResult = {
  deltas: {
    canvasTopFromWorkspace: number;
    editingTextEndFromWorkspaceMinusReading: number;
    editingTextStartFromWorkspaceMinusReading: number;
    lineTopFromWorkspace: number;
  };
  failures: string[];
  pass: boolean;
  rects: {
    editing: ShellModeMeasurement["rects"];
    reading: ShellModeMeasurement["rects"];
  };
};

type ShellMode = "editing" | "reading";

type ShellModeMeasurement = {
  margins: {
    textEndFromWorkspace: number;
    textStartFromWorkspace: number;
  };
  rects: {
    canvas: SerializableRect;
    content: SerializableRect;
    line: SerializableRect;
    workspace: SerializableRect;
  };
};

const MAX_CANVAS_TOP_FROM_WORKSPACE = 150;
const MAX_MODE_TEXT_MARGIN_DELTA = 2;
const MAX_LINE_TOP_FROM_WORKSPACE = 240;
const MIN_CANVAS_HEIGHT = 420;

function toSerializableRect(rect: DOMRect): SerializableRect {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function installLegacyWorkspaceThemeOverride(): void {
  const style = document.createElement("style");
  style.dataset.fishmarkProbe = "legacy-workspace-theme";
  style.textContent = `
    [data-fishmark-layout="workspace"].app-workspace {
      grid-template-rows: auto minmax(0, 1fr) auto;
    }

    [data-fishmark-layout="workspace"] .app-status-bar {
      position: static;
      left: auto;
      right: auto;
      bottom: auto;
      z-index: auto;
      min-height: auto;
      padding: var(--fishmark-space-2) 0 0;
    }
  `;
  document.head.append(style);
}

function createProbeShell(root: HTMLElement, shellMode: ShellMode): HTMLElement {
  const isReadingMode = shellMode === "reading";
  const visibility = isReadingMode ? "collapsed" : "visible";

  root.innerHTML = `
    <main class="app-shell" data-fishmark-shell-mode="${shellMode}" style="--fishmark-titlebar-height: 0px;">
      <div class="app-layout" data-fishmark-shell-mode="${shellMode}" data-fishmark-has-document="true">
        <aside class="app-rail" data-fishmark-layout="rail" data-visibility="${visibility}"></aside>
        <div
          class="app-workspace"
          data-fishmark-layout="workspace"
          data-fishmark-shell-mode="${shellMode}"
          data-fishmark-has-document="true"
        >
          <nav class="workspace-tab-strip" data-fishmark-region="workspace-tab-strip" data-visibility="${visibility}">
            <div class="workspace-tab-strip-scroll">
              <div class="workspace-tab-shell is-active" data-active="true">
                <button type="button" class="workspace-tab" data-active="true">
                  <span class="workspace-tab-label">empty.md</span>
                </button>
              </div>
            </div>
          </nav>
          <section
            class="workspace-canvas is-editor-open"
            data-fishmark-region="workspace-canvas"
            data-fishmark-shell-mode="${shellMode}"
            data-fishmark-has-document="true"
          >
            <div
              data-fishmark-region="shortcut-hint-overlay-shell"
              class="shortcut-hint-overlay-shell"
              data-shortcut-hint-state="hidden"
            ></div>
            <section class="workspace-shell">
              <div class="document-canvas">
                <div id="probe-editor" class="document-editor"></div>
              </div>
            </section>
          </section>
          <footer class="app-status-bar" data-fishmark-region="app-status-bar" data-visibility="${visibility}">
            <div data-fishmark-region="status-strip">
              <p class="save-status is-clean">All changes saved</p>
              <p class="document-word-count">字数 0</p>
            </div>
          </footer>
        </div>
      </div>
    </main>
  `;

  const editorHost = root.querySelector<HTMLElement>("#probe-editor");
  if (!editorHost) {
    throw new Error("Missing empty document editor host.");
  }

  return editorHost;
}

async function measureShellMode(root: HTMLElement, shellMode: ShellMode): Promise<ShellModeMeasurement> {
  const editorHost = createProbeShell(root, shellMode);
  const controller = createCodeEditorController({
    parent: editorHost,
    initialContent: "",
    onChange: () => undefined
  });

  const editorRoot = editorHost.querySelector<HTMLElement>(".cm-editor");
  const content = editorHost.querySelector<HTMLElement>(".cm-content");
  const line = editorHost.querySelector<HTMLElement>(".cm-line");
  if (!editorRoot || !content || !line) {
    throw new Error("Missing CodeMirror empty document nodes.");
  }

  editorRoot.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  controller.focus();
  await nextFrame();

  const workspace = root.querySelector<HTMLElement>(".app-workspace");
  const canvas = root.querySelector<HTMLElement>(".workspace-canvas");
  if (!workspace || !canvas) {
    throw new Error("Missing measured shell nodes.");
  }

  const workspaceRect = workspace.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const contentStyle = window.getComputedStyle(content);
  const contentPaddingStart = Number.parseFloat(contentStyle.paddingLeft);
  const contentPaddingEnd = Number.parseFloat(contentStyle.paddingRight);

  controller.destroy();

  return {
    margins: {
      textEndFromWorkspace: workspaceRect.right - (contentRect.right - contentPaddingEnd),
      textStartFromWorkspace: contentRect.left + contentPaddingStart - workspaceRect.left
    },
    rects: {
      canvas: toSerializableRect(canvasRect),
      content: toSerializableRect(contentRect),
      line: toSerializableRect(lineRect),
      workspace: toSerializableRect(workspaceRect)
    }
  };
}

export async function runEmptyDocumentLayoutProbe(): Promise<EmptyDocumentLayoutProbeResult> {
  document.body.style.margin = "0";
  document.body.style.width = "100vw";
  document.body.style.height = "100vh";
  document.body.style.overflow = "hidden";

  installLegacyWorkspaceThemeOverride();

  const root = document.getElementById("probe-root");
  if (!root) {
    throw new Error("Missing probe root.");
  }

  const editing = await measureShellMode(root, "editing");
  const reading = await measureShellMode(root, "reading");
  const deltas = {
    canvasTopFromWorkspace: editing.rects.canvas.top - editing.rects.workspace.top,
    editingTextEndFromWorkspaceMinusReading:
      editing.margins.textEndFromWorkspace - reading.margins.textEndFromWorkspace,
    editingTextStartFromWorkspaceMinusReading:
      editing.margins.textStartFromWorkspace - reading.margins.textStartFromWorkspace,
    lineTopFromWorkspace: editing.rects.line.top - editing.rects.workspace.top
  };
  const failures: string[] = [];

  if (deltas.canvasTopFromWorkspace > MAX_CANVAS_TOP_FROM_WORKSPACE) {
    failures.push(
      `workspace canvas starts too low: ${deltas.canvasTopFromWorkspace.toFixed(2)}px`
    );
  }

  if (deltas.lineTopFromWorkspace > MAX_LINE_TOP_FROM_WORKSPACE) {
    failures.push(
      `empty document line starts too low: ${deltas.lineTopFromWorkspace.toFixed(2)}px`
    );
  }

  if (Math.abs(deltas.editingTextStartFromWorkspaceMinusReading) > MAX_MODE_TEXT_MARGIN_DELTA) {
    failures.push(
      `editing text start margin differs from reading by ${deltas.editingTextStartFromWorkspaceMinusReading.toFixed(
        2
      )}px`
    );
  }

  if (Math.abs(deltas.editingTextEndFromWorkspaceMinusReading) > MAX_MODE_TEXT_MARGIN_DELTA) {
    failures.push(
      `editing text end margin differs from reading by ${deltas.editingTextEndFromWorkspaceMinusReading.toFixed(
        2
      )}px`
    );
  }

  if (editing.rects.canvas.height < MIN_CANVAS_HEIGHT) {
    failures.push(`workspace canvas is too short: ${editing.rects.canvas.height.toFixed(2)}px`);
  }

  return {
    deltas,
    failures,
    pass: failures.length === 0,
    rects: {
      editing: editing.rects,
      reading: reading.rects
    }
  };
}

Object.assign(window, {
  __runFishmarkEmptyDocumentLayoutProbe: runEmptyDocumentLayoutProbe
});
