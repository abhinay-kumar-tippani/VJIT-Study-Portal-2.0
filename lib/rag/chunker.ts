import { PageText } from './extractText';

export interface RawChunk {
  chunkIndex: number;
  pageNumber: number | null;
  text: string;
}

/**
 * Splits document pages into overlapping text chunks (~1500 chars chunk size, 300 char overlap).
 * Ignores scanned pages (isScanned === true).
 */
export function chunkPages(
  pages: PageText[],
  chunkSize = 1500,
  overlap = 300
): RawChunk[] {
  const chunks: RawChunk[] = [];
  let currentChunkIndex = 0;

  for (const page of pages) {
    if (page.isScanned || !page.text) continue;

    const pageText = page.text;
    if (pageText.length <= chunkSize) {
      chunks.push({
        chunkIndex: currentChunkIndex++,
        pageNumber: page.pageNumber,
        text: pageText,
      });
      continue;
    }

    // Split page text into overlapping windows
    let start = 0;
    while (start < pageText.length) {
      let end = start + chunkSize;
      if (end < pageText.length) {
        // Try to break at paragraph or sentence boundary
        const nextBreak = pageText.lastIndexOf('\n', end);
        const nextPeriod = pageText.lastIndexOf('. ', end);
        const bestBreak = Math.max(nextBreak, nextPeriod);

        if (bestBreak > start + chunkSize * 0.5) {
          end = bestBreak + 1;
        }
      } else {
        end = pageText.length;
      }

      const chunkText = pageText.slice(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({
          chunkIndex: currentChunkIndex++,
          pageNumber: page.pageNumber,
          text: chunkText,
        });
      }

      if (end >= pageText.length) break;
      start = end - overlap;
    }
  }

  return chunks;
}
