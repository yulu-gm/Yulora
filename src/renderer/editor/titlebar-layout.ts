export const TITLEBAR_ITEMS = [
  "app-icon",
  "document-title",
  "dirty-indicator",
  "theme-toggle",
  "window-actions"
] as const;
export const TITLEBAR_SLOTS = ["leading", "center", "trailing"] as const;

export type TitlebarItem = (typeof TITLEBAR_ITEMS)[number];
export type TitlebarSlot = (typeof TITLEBAR_SLOTS)[number];

export type TitlebarLayoutDescriptor = {
  height: number;
  slots: Record<TitlebarSlot, TitlebarItem[]>;
  dragRegions: TitlebarSlot[];
  compactWhenNarrow: boolean;
};

const DEFAULT_TITLEBAR_HEIGHT = 44;
const MIN_TITLEBAR_HEIGHT = 36;
const MAX_TITLEBAR_HEIGHT = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeTitlebarItems(raw: unknown): TitlebarItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<TitlebarItem>();

  return raw.reduce<TitlebarItem[]>((items, entry) => {
    if (typeof entry !== "string") {
      return items;
    }

    if (!TITLEBAR_ITEMS.includes(entry as TitlebarItem)) {
      return items;
    }

    const item = entry as TitlebarItem;
    if (seen.has(item)) {
      return items;
    }

    seen.add(item);
    items.push(item);
    return items;
  }, []);
}

function hasOwnProperty(
  value: Record<string, unknown>,
  key: TitlebarSlot
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeDragRegions(raw: unknown): TitlebarSlot[] {
  if (!Array.isArray(raw)) {
    return ["leading", "center"];
  }

  const seen = new Set<TitlebarSlot>();

  return raw.reduce<TitlebarSlot[]>((regions, entry) => {
    if (typeof entry !== "string") {
      return regions;
    }

    if (!TITLEBAR_SLOTS.includes(entry as TitlebarSlot)) {
      return regions;
    }

    const region = entry as TitlebarSlot;
    if (seen.has(region)) {
      return regions;
    }

    seen.add(region);
    regions.push(region);
    return regions;
  }, []);
}

export const DEFAULT_TITLEBAR_LAYOUT: TitlebarLayoutDescriptor = {
  height: DEFAULT_TITLEBAR_HEIGHT,
  slots: {
    leading: ["app-icon"],
    center: ["document-title", "dirty-indicator"],
    trailing: []
  },
  dragRegions: ["leading", "center"],
  compactWhenNarrow: true
};

export function resolveDefaultTitlebarLayout(platform: NodeJS.Platform): TitlebarLayoutDescriptor {
  if (platform === "darwin") {
    return {
      height: DEFAULT_TITLEBAR_HEIGHT,
      slots: {
        leading: [],
        center: ["document-title", "dirty-indicator"],
        trailing: []
      },
      dragRegions: ["leading", "center", "trailing"],
      compactWhenNarrow: true
    };
  }

  return DEFAULT_TITLEBAR_LAYOUT;
}

export function normalizeTitlebarLayout(raw: unknown): TitlebarLayoutDescriptor {
  const source = isRecord(raw) ? raw : {};
  const slotSource = isRecord(source.slots) ? source.slots : {};
  const leading = normalizeTitlebarItems(slotSource.leading);
  const center = normalizeTitlebarItems(slotSource.center);
  const trailing = normalizeTitlebarItems(slotSource.trailing);
  const dragRegions = normalizeDragRegions(source.dragRegions);

  return {
    height: clampInteger(
      typeof source.height === "number" ? source.height : DEFAULT_TITLEBAR_LAYOUT.height,
      MIN_TITLEBAR_HEIGHT,
      MAX_TITLEBAR_HEIGHT
    ),
    slots: {
      leading: hasOwnProperty(slotSource, "leading") ? leading : DEFAULT_TITLEBAR_LAYOUT.slots.leading,
      center: hasOwnProperty(slotSource, "center") ? center : DEFAULT_TITLEBAR_LAYOUT.slots.center,
      trailing: hasOwnProperty(slotSource, "trailing") ? trailing : DEFAULT_TITLEBAR_LAYOUT.slots.trailing
    },
    dragRegions: dragRegions.length > 0 ? dragRegions : DEFAULT_TITLEBAR_LAYOUT.dragRegions,
    compactWhenNarrow: source.compactWhenNarrow !== false
  };
}
