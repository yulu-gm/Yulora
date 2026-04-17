import { describe, expect, it } from "vitest";

import {
  normalizeTitlebarLayout,
  resolveDefaultTitlebarLayout
} from "./titlebar-layout";

describe("normalizeTitlebarLayout", () => {
  it("keeps only supported titlebar items and drag regions", () => {
    expect(
      normalizeTitlebarLayout({
        height: 44,
        slots: {
          leading: ["app-icon"],
          center: ["document-title"],
          trailing: ["window-actions", "custom-widget"]
        },
        dragRegions: ["leading", "center", "custom"]
      })
    ).toEqual({
      height: 44,
      slots: {
        leading: ["app-icon"],
        center: ["document-title"],
        trailing: ["window-actions"]
      },
      dragRegions: ["leading", "center"],
      compactWhenNarrow: true
    });
  });

  it("clamps height and falls back to the controlled default layout", () => {
    expect(
      normalizeTitlebarLayout({
        height: 96,
        slots: {
          center: ["document-title", "document-title"],
          trailing: ["theme-toggle"]
        },
        dragRegions: ["trailing"],
        compactWhenNarrow: false
      })
    ).toEqual({
      height: 60,
      slots: {
        leading: ["app-icon"],
        center: ["document-title"],
        trailing: ["theme-toggle"]
      },
      dragRegions: ["trailing"],
      compactWhenNarrow: false
    });
  });

  it("uses a platform-correct default layout for macOS editor windows", () => {
    expect(resolveDefaultTitlebarLayout("darwin")).toEqual({
      height: 44,
      slots: {
        leading: [],
        center: ["document-title", "dirty-indicator"],
        trailing: []
      },
      dragRegions: ["leading", "center", "trailing"],
      compactWhenNarrow: true
    });
  });
});
