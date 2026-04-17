export type HtmlImageAlignment = "left" | "center" | "right";

export type HtmlImageData = {
  src: string | null;
  alt: string;
  title: string | null;
  width: string | null;
  height: string | null;
  zoom: string | null;
  align: HtmlImageAlignment | null;
};

export function parseHtmlImageData(sourceSlice: string): HtmlImageData | null {
  const trimmedSource = sourceSlice.trim();

  if (trimmedSource.length === 0) {
    return null;
  }

  const standaloneMatch = /^<img\b([\s\S]*?)\/?>$/i.exec(trimmedSource);
  const wrappedMatch = /^<(p|div)\b([^>]*)>\s*<img\b([\s\S]*?)\/?>\s*<\/\1>$/i.exec(trimmedSource);

  const wrapperAttributes = wrappedMatch ? parseHtmlAttributes(wrappedMatch[2] ?? "") : null;
  const imageAttributesSource = standaloneMatch?.[1] ?? wrappedMatch?.[3];

  if (!imageAttributesSource) {
    return null;
  }

  const imageAttributes = parseHtmlAttributes(imageAttributesSource);

  if (!imageAttributes.src) {
    return null;
  }

  return {
    src: imageAttributes.src,
    alt: imageAttributes.alt ?? "",
    title: imageAttributes.title ?? null,
    width: imageAttributes.width ?? readStyleDeclaration(imageAttributes.style, "width"),
    height: imageAttributes.height ?? readStyleDeclaration(imageAttributes.style, "height"),
    zoom: readStyleDeclaration(imageAttributes.style, "zoom"),
    align:
      normalizeAlignment(wrapperAttributes?.align) ??
      normalizeAlignment(readStyleDeclaration(wrapperAttributes?.style, "text-align")) ??
      normalizeAlignment(imageAttributes.align),
  };
}

function parseHtmlAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of source.matchAll(pattern)) {
    const name = match[1]?.toLowerCase();

    if (!name) {
      continue;
    }

    attributes[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

function readStyleDeclaration(styleValue: string | undefined, propertyName: string): string | null {
  if (!styleValue) {
    return null;
  }

  for (const declaration of styleValue.split(";")) {
    const [rawName, ...rawValueParts] = declaration.split(":");

    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    if (rawName.trim().toLowerCase() !== propertyName) {
      continue;
    }

    const value = rawValueParts.join(":").trim();
    return value.length > 0 ? value : null;
  }

  return null;
}

function normalizeAlignment(value: string | null | undefined): HtmlImageAlignment | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "left" || normalized === "center" || normalized === "right") {
    return normalized;
  }

  return null;
}
