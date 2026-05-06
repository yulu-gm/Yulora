export type CodeBlockKind = "fenced" | "indented";

export function resolveIndentedCodeContentStartOffset(
  source: string,
  lineStartOffset: number,
  lineEndOffset: number
): number {
  let cursor = lineStartOffset;
  let consumedColumns = 0;

  while (cursor < lineEndOffset && consumedColumns < 4) {
    const character = source[cursor];

    if (character === " ") {
      cursor += 1;
      consumedColumns += 1;
      continue;
    }

    if (character === "\t") {
      cursor += 1;
      consumedColumns = 4;
      continue;
    }

    break;
  }

  return cursor;
}
