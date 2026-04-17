export type DocumentMetrics = {
  meaningfulCharacterCount: number;
};

export function getDocumentMetrics(content: string): DocumentMetrics {
  return {
    meaningfulCharacterCount: countMeaningfulCharacters(content)
  };
}

function countMeaningfulCharacters(value: string): number {
  const meaningfulChars = value.match(/[^\s]/gu);
  return meaningfulChars?.length ?? 0;
}
