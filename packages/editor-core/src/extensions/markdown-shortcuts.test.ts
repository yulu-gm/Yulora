import { describe, expect, it } from "vitest";

import {
  formatShortcutHintKey,
  TEXT_EDITING_SHORTCUTS
} from "./markdown-shortcuts";

describe("markdown shortcut metadata", () => {
  it("lists all text-editing shortcuts in display order", () => {
    expect(
      TEXT_EDITING_SHORTCUTS.map(({ id, key, label }) => ({ id, key, label }))
    ).toEqual([
      { id: "toggle-strong", key: "Mod-b", label: "Bold" },
      { id: "toggle-emphasis", key: "Mod-i", label: "Italic" },
      { id: "toggle-heading-1", key: "Mod-1", label: "Heading 1" },
      { id: "toggle-heading-2", key: "Mod-2", label: "Heading 2" },
      { id: "toggle-heading-3", key: "Mod-3", label: "Heading 3" },
      { id: "toggle-heading-4", key: "Mod-4", label: "Heading 4" },
      { id: "toggle-bullet-list", key: "Mod-Shift-7", label: "Bullet List" },
      { id: "toggle-blockquote", key: "Mod-Shift-9", label: "Blockquote" },
      { id: "toggle-code-fence", key: "Mod-Alt-Shift-c", label: "Code Block" }
    ]);
  });

  it("formats Mod shortcuts for win32 and darwin", () => {
    expect(formatShortcutHintKey("Mod-Shift-7", "win32")).toBe("Ctrl+Shift+7");
    expect(formatShortcutHintKey("Mod-Shift-7", "darwin")).toBe("Cmd+Shift+7");
    expect(formatShortcutHintKey("Mod-Alt-Shift-c", "darwin")).toBe("Cmd+Alt+Shift+C");
  });
});
