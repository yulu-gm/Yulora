import type { EditorView, KeyBinding } from "@codemirror/view";

import type { ActiveBlockState } from "../active-block";
import {
  toggleBlockquote,
  toggleBulletList,
  toggleCodeFence,
  toggleEmphasis,
  toggleHeading,
  toggleStrong
} from "../commands";

export type TextEditingShortcut = {
  id:
    | "toggle-strong"
    | "toggle-emphasis"
    | "toggle-heading-1"
    | "toggle-heading-2"
    | "toggle-heading-3"
    | "toggle-heading-4"
    | "toggle-bullet-list"
    | "toggle-blockquote"
    | "toggle-code-fence";
  key: string;
  label: string;
};

export const TEXT_EDITING_SHORTCUTS: readonly TextEditingShortcut[] = [
  { id: "toggle-strong", key: "Mod-b", label: "Bold" },
  { id: "toggle-emphasis", key: "Mod-i", label: "Italic" },
  { id: "toggle-heading-1", key: "Mod-1", label: "Heading 1" },
  { id: "toggle-heading-2", key: "Mod-2", label: "Heading 2" },
  { id: "toggle-heading-3", key: "Mod-3", label: "Heading 3" },
  { id: "toggle-heading-4", key: "Mod-4", label: "Heading 4" },
  { id: "toggle-bullet-list", key: "Mod-Shift-7", label: "Bullet List" },
  { id: "toggle-blockquote", key: "Mod-Shift-9", label: "Blockquote" },
  { id: "toggle-code-fence", key: "Mod-Alt-Shift-c", label: "Code Block" }
];

const formatShortcutHintToken = (token: string) => {
  if (token === "Mod") {
    return "";
  }

  if (token.length === 1) {
    return token.toUpperCase();
  }

  return token.charAt(0).toUpperCase() + token.slice(1);
};

export const formatShortcutHintKey = (key: string, platform: string) => {
  const modifier = platform === "darwin" ? "Cmd" : "Ctrl";

  return key
    .split("-")
    .map((token) => (token === "Mod" ? modifier : formatShortcutHintToken(token)))
    .filter(Boolean)
    .join("+");
};

const createTextEditingShortcutRun = (
  shortcutId: TextEditingShortcut["id"],
  getActiveBlockState: () => ActiveBlockState
): ((view: EditorView) => boolean) => {
  switch (shortcutId) {
    case "toggle-strong":
      return (view: EditorView) => toggleStrong(view, getActiveBlockState());
    case "toggle-emphasis":
      return (view: EditorView) => toggleEmphasis(view, getActiveBlockState());
    case "toggle-heading-1":
      return (view: EditorView) => toggleHeading(1)(view, getActiveBlockState());
    case "toggle-heading-2":
      return (view: EditorView) => toggleHeading(2)(view, getActiveBlockState());
    case "toggle-heading-3":
      return (view: EditorView) => toggleHeading(3)(view, getActiveBlockState());
    case "toggle-heading-4":
      return (view: EditorView) => toggleHeading(4)(view, getActiveBlockState());
    case "toggle-bullet-list":
      return (view: EditorView) => toggleBulletList(view, getActiveBlockState());
    case "toggle-blockquote":
      return (view: EditorView) => toggleBlockquote(view, getActiveBlockState());
    case "toggle-code-fence":
      return (view: EditorView) => toggleCodeFence(view, getActiveBlockState());
    default:
      throw new Error(`Unknown text editing shortcut: ${shortcutId}`);
  }
};

export const createTextEditingShortcutKeymap = (
  getActiveBlockState: () => ActiveBlockState
): KeyBinding[] =>
  TEXT_EDITING_SHORTCUTS.map(({ id, key }) => ({
    key,
    run: createTextEditingShortcutRun(id, getActiveBlockState)
  }));
