import { useState } from "react";

import {
  applyOpenMarkdownResult,
  createInitialAppState,
  startOpeningMarkdownFile,
  updateCurrentDocumentContent
} from "./document-state";

export default function App() {
  const [state, setState] = useState(createInitialAppState);

  async function handleOpenMarkdown(): Promise<void> {
    setState((current) => startOpeningMarkdownFile(current));

    const result = await window.yulora.openMarkdownFile();

    setState((current) => applyOpenMarkdownResult(current, result));
  }

  return (
    <main className="shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">TASK-003</p>
            <h1>Yulora</h1>
          </div>
          <button
            className="open-button"
            onClick={() => void handleOpenMarkdown()}
            disabled={state.openState === "opening"}
            type="button"
          >
            {state.openState === "opening" ? "Opening..." : "Open Markdown"}
          </button>
        </div>
        <p className="description">
          Open a local UTF-8 Markdown file through the secure Electron bridge. The temporary editor
          below is only an in-memory surface until CodeMirror lands.
        </p>
        <p className="meta">Preload bridge status: {window.yulora.platform}</p>

        {state.errorMessage ? (
          <p
            className="error-banner"
            role="alert"
          >
            {state.errorMessage}
          </p>
        ) : null}

        {state.currentDocument ? (
          <section className="document-panel">
            <div className="document-meta">
              <p className="document-label">Current document</p>
              <h2>{state.currentDocument.name}</h2>
              <p className="document-path">{state.currentDocument.path}</p>
            </div>
            <textarea
              className="document-editor"
              value={state.currentDocument.content}
              onChange={(event) => {
                setState((current) => updateCurrentDocumentContent(current, event.target.value));
              }}
              spellCheck={false}
            />
          </section>
        ) : (
          <section className="empty-state">
            <p className="document-label">No document loaded</p>
            <p className="empty-copy">
              Choose a Markdown file to load its text into the current document state.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
