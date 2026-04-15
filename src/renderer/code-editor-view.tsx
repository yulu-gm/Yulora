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

export type CodeEditorHandle = {
  getContent: () => string;
};

type CodeEditorViewProps = {
  initialContent: string;
  loadRevision: number;
  onChange: (content: string) => void;
  onBlur?: () => void;
};

export const CodeEditorView = forwardRef<CodeEditorHandle, CodeEditorViewProps>(
  function CodeEditorView({ initialContent, loadRevision, onChange, onBlur }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const controllerRef = useRef<CodeEditorController | null>(null);
    const initialContentRef = useRef(initialContent);
    const handleChange = useEffectEvent(onChange);
    const handleBlur = useEffectEvent(() => onBlur?.());

    useEffect(() => {
      if (!hostRef.current) {
        return undefined;
      }

      const controller = createCodeEditorController({
        parent: hostRef.current,
        initialContent: initialContentRef.current,
        onChange: (content) => handleChange(content),
        onBlur: () => handleBlur()
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
      controllerRef.current?.replaceDocument(initialContent);
    }, [initialContent, loadRevision]);

    useImperativeHandle(
      ref,
      () => ({
        getContent: () => controllerRef.current?.getContent() ?? initialContent
      }),
      [initialContent]
    );

    return <div className="document-editor" ref={hostRef} />;
  }
);
