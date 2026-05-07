export type TableColumnLayoutInput = {
  header: readonly string[];
  rows: readonly (readonly string[])[];
};

export type TableColumnLayout = {
  columnIndex: number;
  readableWeight: number;
  widthPercent: number;
};

export const TABLE_COLUMN_MIN_READABLE_WEIGHT = 8;
export const TABLE_COLUMN_MAX_CONTENT_WEIGHT = 48;
export const TABLE_COLUMN_CELL_PADDING_WEIGHT = 8;

export function computeTableColumnLayout(input: TableColumnLayoutInput): TableColumnLayout[] {
  const columnCount = Math.max(input.header.length, ...input.rows.map((row) => row.length), 0);

  if (columnCount === 0) {
    return [];
  }

  const readableWeights = Array.from({ length: columnCount }, (_, columnIndex) => {
    const cells = [
      input.header[columnIndex] ?? "",
      ...input.rows.map((row) => row[columnIndex] ?? "")
    ];
    const maxReadableLength = Math.max(...cells.map(measureReadableCellLength), 0);

    const contentWeight = Math.max(
      TABLE_COLUMN_MIN_READABLE_WEIGHT,
      Math.min(maxReadableLength, TABLE_COLUMN_MAX_CONTENT_WEIGHT)
    );

    return contentWeight + TABLE_COLUMN_CELL_PADDING_WEIGHT;
  });
  const totalWeight = readableWeights.reduce((sum, weight) => sum + weight, 0);

  return readableWeights.map((readableWeight, columnIndex) => ({
    columnIndex,
    readableWeight,
    widthPercent: (readableWeight / totalWeight) * 100
  }));
}

export function formatTableColumnWidthPercent(widthPercent: number): string {
  return `${widthPercent.toFixed(2)}%`;
}

function measureReadableCellLength(cell: string): number {
  return Array.from(cell.trim()).reduce(
    (length, character) => length + (isWideReadableCharacter(character) ? 2 : 1),
    0
  );
}

function isWideReadableCharacter(character: string): boolean {
  return /[\p{Script=Han}\u3000-\u303F\uFF00-\uFFEF]/u.test(character);
}
