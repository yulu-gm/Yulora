import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef
} from "react";

import {
  createCodeEditorController,
  type CodeEditorController
} from "./code-editor";
import type { ActiveBlockState } from "@yulora/editor-core";

export type CodeEditorHandle = {
  getContent: () => string;
  setContent: (content: string) => void;
  setDocumentPath: (documentPath: string | null) => void;
  focus: () => void;
  navigateToOffset: (offset: number) => void;
  insertText: (text: string) => void;
  setSelection: (anchor: number, head?: number) => void;
  pressEnter: () => void;
};

type CodeEditorViewProps = {
  initialContent: string;
  documentPath: string | null;
  loadRevision: number;
  onChange: (content: string) => void;
  onBlur?: () => void;
  onActiveBlockChange?: (state: ActiveBlockState) => void;
  importClipboardImage?: (input: { documentPath: string | null }) => Promise<string | null>;
};

export const CodeEditorView = forwardRef<CodeEditorHandle, CodeEditorViewProps>(
  function CodeEditorView(
    { initialContent, documentPath, loadRevision, onChange, onBlur, onActiveBlockChange, importClipboardImage },
    ref
  ) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const controllerRef = useRef<CodeEditorController | null>(null);
    const initialContentRef = useRef(initialContent);
    const latestLoadedContentRef = useRef(initialContent);
    const handleChange = useEffectEvent(onChange);
    const handleBlur = useEffectEvent(() => onBlur?.());
    const handleActiveBlockChange = useEffectEvent((state: ActiveBlockState) =>
      onActiveBlockChange?.(state)
    );
    const handleImportClipboardImage = useEffectEvent((input: { documentPath: string | null }) =>
      importClipboardImage?.(input) ?? Promise.resolve(null)
    );

    useEffect(() => {
      if (!hostRef.current) {
        return undefined;
      }

      const controller = createCodeEditorController({
        parent: hostRef.current,
        initialContent: initialContentRef.current,
        documentPath: null,
        onChange: (content) => handleChange(content),
        onBlur: () => handleBlur(),
        onActiveBlockChange: (state) => handleActiveBlockChange(state),
        importClipboardImage: (input) => handleImportClipboardImage(input)
      });

      controllerRef.current = controller;

      return () => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }

        controller.destroy();
      };
    }, []);

    useEffect(() => {
      latestLoadedContentRef.current = initialContent;
    }, [initialContent]);

    useEffect(() => {
      controllerRef.current?.replaceDocument(latestLoadedContentRef.current);
    }, [loadRevision]);

    useEffect(() => {
      controllerRef.current?.setDocumentPath(documentPath);
    }, [documentPath]);

    useImperativeHandle(
      ref,
      () => ({
        getContent: () => controllerRef.current?.getContent() ?? initialContent,
        setContent: (content: string) => {
          controllerRef.current?.replaceDocument(content);
        },
        setDocumentPath: (nextDocumentPath: string | null) => {
          controllerRef.current?.setDocumentPath(nextDocumentPath);
        },
        focus: () => {
          controllerRef.current?.focus();
        },
        navigateToOffset: (offset: number) => {
          controllerRef.current?.navigateToOffset(offset);
        },
        insertText: (text: string) => {
          controllerRef.current?.insertText(text);
        },
        setSelection: (anchor: number, head?: number) => {
          controllerRef.current?.setSelection(anchor, head);
        },
        pressEnter: () => {
          controllerRef.current?.pressEnter();
        }
      }),
      [initialContent]
    );

    return <div className="document-editor" ref={hostRef} />;
  }
);
