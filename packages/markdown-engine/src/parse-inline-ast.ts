import { parse, postprocess, preprocess } from "micromark";
import type { Token } from "micromark-util-types";

import { strikethrough } from "./extensions/strikethrough";
import type {
  InlineCodeSpan,
  InlineEmphasis,
  InlineImage,
  InlineLink,
  InlineMarker,
  InlineNode,
  InlineRoot,
  InlineStrong,
  InlineStrikethrough,
  InlineText
} from "./inline-ast";

type ContainerKind = InlineContainerNode["type"];
type InlineContainerNode = InlineStrong | InlineEmphasis | InlineStrikethrough | InlineLink | InlineImage;

type RootEntry = {
  kind: "root";
  node: InlineRoot;
};

type ContainerEntry = {
  kind: "container";
  containerKind: ContainerKind;
  node: InlineContainerNode;
  markerCount: number;
};

type CodeEntry = {
  kind: "code";
  node: InlineCodeSpan;
  markerCount: number;
  textChunks: string[];
};

type AstStackEntry = RootEntry | ContainerEntry | CodeEntry;

export function parseInlineAst(source: string, startOffset: number, endOffset: number): InlineRoot {
  const clampedStartOffset = clampOffset(startOffset, 0, source.length);
  const clampedEndOffset = clampOffset(endOffset, clampedStartOffset, source.length);
  const sourceSlice = source.slice(clampedStartOffset, clampedEndOffset);
  const root: InlineRoot = {
    type: "root",
    startOffset: clampedStartOffset,
    endOffset: clampedEndOffset,
    children: []
  };

  if (sourceSlice.length === 0) {
    return root;
  }

  const events = postprocess(
    parse({ extensions: [strikethrough()] }).text().write(preprocess()(sourceSlice, "utf8", true))
  );

  const stack: AstStackEntry[] = [{ kind: "root", node: root }];
  let resourceDepth = 0;

  for (const [phase, token] of events) {
    const tokenType = token.type as string;

    if (phase === "enter") {
      if (tokenType === "resource") {
        resourceDepth += 1;
      }

      if (tokenType === "strong") {
        stack.push({
          kind: "container",
          containerKind: "strong",
          markerCount: 0,
          node: createContainerNode("strong", token, clampedStartOffset)
        });
        continue;
      }

      if (tokenType === "emphasis") {
        stack.push({
          kind: "container",
          containerKind: "emphasis",
          markerCount: 0,
          node: createContainerNode("emphasis", token, clampedStartOffset)
        });
        continue;
      }

      if (tokenType === "strikethrough") {
        stack.push({
          kind: "container",
          containerKind: "strikethrough",
          markerCount: 0,
          node: createContainerNode("strikethrough", token, clampedStartOffset)
        });
        continue;
      }

      if (tokenType === "link") {
        stack.push({
          kind: "container",
          containerKind: "link",
          markerCount: 0,
          node: createLinkNode(token, clampedStartOffset)
        });
        continue;
      }

      if (tokenType === "image") {
        stack.push({
          kind: "container",
          containerKind: "image",
          markerCount: 0,
          node: createImageNode(token, clampedStartOffset)
        });
        continue;
      }

      if (tokenType === "codeText") {
        stack.push({
          kind: "code",
          markerCount: 0,
          textChunks: [],
          node: createCodeSpanNode(token, clampedStartOffset)
        });
        continue;
      }

      if (tokenType === "strongSequence") {
        assignContainerMarker(stack, "strong", token, clampedStartOffset);
        continue;
      }

      if (tokenType === "emphasisSequence") {
        assignContainerMarker(stack, "emphasis", token, clampedStartOffset);
        continue;
      }

      if (tokenType === "strikethroughSequence") {
        assignContainerMarker(stack, "strikethrough", token, clampedStartOffset);
        continue;
      }

      if (tokenType === "labelMarker") {
        assignContainerMarker(stack, ["link", "image"], token, clampedStartOffset);
        continue;
      }

      if (tokenType === "codeTextSequence") {
        assignCodeMarker(stack, token, clampedStartOffset);
        continue;
      }

      if (tokenType === "codeTextData") {
        const codeEntry = getNearestCodeEntry(stack);
        if (codeEntry) {
          codeEntry.textChunks.push(readSlice(sourceSlice, token));
        }
        continue;
      }

      if (tokenType === "resourceDestination") {
        const mediaNode = getNearestMediaNode(stack);
        if (mediaNode) {
          mediaNode.href = readSlice(sourceSlice, token);
          mediaNode.destinationStartOffset = toAbsoluteOffset(clampedStartOffset, token.start.offset);
          mediaNode.destinationEndOffset = toAbsoluteOffset(clampedStartOffset, token.end.offset);
        }
        continue;
      }

      if (tokenType === "resourceTitleString") {
        const mediaNode = getNearestMediaNode(stack);
        if (mediaNode) {
          mediaNode.title = readSlice(sourceSlice, token);
          mediaNode.titleStartOffset = toAbsoluteOffset(clampedStartOffset, token.start.offset);
          mediaNode.titleEndOffset = toAbsoluteOffset(clampedStartOffset, token.end.offset);
        }
        continue;
      }

      if (tokenType === "data" && resourceDepth === 0) {
        const value = readSlice(sourceSlice, token);
        if (value.length === 0) {
          continue;
        }

        const textNode: InlineText = {
          type: "text",
          startOffset: toAbsoluteOffset(clampedStartOffset, token.start.offset),
          endOffset: toAbsoluteOffset(clampedStartOffset, token.end.offset),
          value
        };
        appendNode(stack, textNode);
      }

      continue;
    }

    if (tokenType === "resource") {
      resourceDepth = Math.max(0, resourceDepth - 1);
      continue;
    }

    if (tokenType === "strong" || tokenType === "emphasis" || tokenType === "strikethrough" || tokenType === "link" || tokenType === "image") {
      const containerKind = tokenType as ContainerKind;
      const containerEntry = popContainerEntry(stack, containerKind);
      if (containerEntry) {
        ensureContainerMarkers(containerEntry.node);
        appendNode(stack, containerEntry.node);
      }
      continue;
    }

    if (tokenType === "codeText") {
      const codeEntry = popCodeEntry(stack);
      if (codeEntry) {
        codeEntry.node.text = codeEntry.textChunks.join("");
        ensureCodeMarkers(codeEntry.node);
        appendNode(stack, codeEntry.node);
      }
    }
  }

  return root;
}

function clampOffset(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toAbsoluteOffset(base: number, localOffset: number): number {
  return base + localOffset;
}

function readSlice(source: string, token: Token): string {
  return source.slice(token.start.offset, token.end.offset);
}

function createMarker(startOffset: number, endOffset: number): InlineMarker {
  return { startOffset, endOffset };
}

function createContainerNode(kind: "strong" | "emphasis" | "strikethrough", token: Token, baseOffset: number): InlineStrong | InlineEmphasis | InlineStrikethrough {
  const startOffset = toAbsoluteOffset(baseOffset, token.start.offset);
  return {
    type: kind,
    startOffset,
    endOffset: toAbsoluteOffset(baseOffset, token.end.offset),
    children: [],
    openMarker: createMarker(startOffset, startOffset),
    closeMarker: createMarker(startOffset, startOffset)
  };
}

function createLinkNode(token: Token, baseOffset: number): InlineLink {
  const startOffset = toAbsoluteOffset(baseOffset, token.start.offset);
  return {
    type: "link",
    startOffset,
    endOffset: toAbsoluteOffset(baseOffset, token.end.offset),
    children: [],
    openMarker: createMarker(startOffset, startOffset),
    closeMarker: createMarker(startOffset, startOffset),
    href: null,
    title: null,
    destinationStartOffset: null,
    destinationEndOffset: null,
    titleStartOffset: null,
    titleEndOffset: null
  };
}

function createImageNode(token: Token, baseOffset: number): InlineImage {
  const startOffset = toAbsoluteOffset(baseOffset, token.start.offset);
  return {
    type: "image",
    startOffset,
    endOffset: toAbsoluteOffset(baseOffset, token.end.offset),
    children: [],
    openMarker: createMarker(startOffset, startOffset),
    closeMarker: createMarker(startOffset, startOffset),
    href: null,
    title: null,
    destinationStartOffset: null,
    destinationEndOffset: null,
    titleStartOffset: null,
    titleEndOffset: null
  };
}

function createCodeSpanNode(token: Token, baseOffset: number): InlineCodeSpan {
  const startOffset = toAbsoluteOffset(baseOffset, token.start.offset);
  return {
    type: "codeSpan",
    startOffset,
    endOffset: toAbsoluteOffset(baseOffset, token.end.offset),
    text: "",
    openMarker: createMarker(startOffset, startOffset),
    closeMarker: createMarker(startOffset, startOffset)
  };
}

function appendNode(stack: AstStackEntry[], node: InlineNode): void {
  const parent = stack[stack.length - 1];
  if (!parent || parent.kind === "code") {
    return;
  }

  const siblings = parent.node.children;
  if (node.type === "text") {
    const lastNode = siblings[siblings.length - 1];
    if (lastNode?.type === "text") {
      lastNode.value += node.value;
      lastNode.endOffset = node.endOffset;
      return;
    }
  }

  siblings.push(node);
}

function assignContainerMarker(
  stack: AstStackEntry[],
  kind: ContainerKind | ContainerKind[],
  token: Token,
  baseOffset: number
): void {
  const targetKinds = Array.isArray(kind) ? kind : [kind];
  const containerEntry = [...stack]
    .reverse()
    .find(
      (entry): entry is ContainerEntry => entry.kind === "container" && targetKinds.includes(entry.containerKind)
    );

  if (!containerEntry) {
    return;
  }

  const marker = createMarker(
    toAbsoluteOffset(baseOffset, token.start.offset),
    toAbsoluteOffset(baseOffset, token.end.offset)
  );

  if (containerEntry.markerCount === 0) {
    containerEntry.node.openMarker = marker;
  } else {
    containerEntry.node.closeMarker = marker;
  }
  containerEntry.markerCount += 1;
}

function assignCodeMarker(stack: AstStackEntry[], token: Token, baseOffset: number): void {
  const codeEntry = getNearestCodeEntry(stack);
  if (!codeEntry) {
    return;
  }

  const marker = createMarker(
    toAbsoluteOffset(baseOffset, token.start.offset),
    toAbsoluteOffset(baseOffset, token.end.offset)
  );
  if (codeEntry.markerCount === 0) {
    codeEntry.node.openMarker = marker;
  } else {
    codeEntry.node.closeMarker = marker;
  }
  codeEntry.markerCount += 1;
}

function popContainerEntry(stack: AstStackEntry[], kind: ContainerKind): ContainerEntry | null {
  const entry = stack[stack.length - 1];
  if (!entry || entry.kind !== "container" || entry.containerKind !== kind) {
    return null;
  }

  stack.pop();
  return entry;
}

function popCodeEntry(stack: AstStackEntry[]): CodeEntry | null {
  const entry = stack[stack.length - 1];
  if (!entry || entry.kind !== "code") {
    return null;
  }

  stack.pop();
  return entry;
}

function getNearestCodeEntry(stack: AstStackEntry[]): CodeEntry | null {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index];
    if (entry?.kind === "code") {
      return entry;
    }
  }

  return null;
}

function getNearestMediaNode(stack: AstStackEntry[]): InlineLink | InlineImage | null {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index];
    if (
      entry?.kind === "container" &&
      (entry.containerKind === "link" || entry.containerKind === "image")
    ) {
      return entry.node as InlineLink | InlineImage;
    }
  }

  return null;
}

function ensureContainerMarkers(node: InlineContainerNode): void {
  if (node.closeMarker.startOffset === node.closeMarker.endOffset) {
    node.closeMarker = { ...node.openMarker };
  }
}

function ensureCodeMarkers(node: InlineCodeSpan): void {
  if (node.closeMarker.startOffset === node.closeMarker.endOffset) {
    node.closeMarker = { ...node.openMarker };
  }
}
