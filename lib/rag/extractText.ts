import mammoth from 'mammoth';

export interface PageText {
  pageNumber: number | null; // null for DOCX, 1..N for PDF and PPTX slides
  text: string;
  isScanned: boolean; // text.trim().length < 100
}

export interface ExtractedDocument {
  driveFileId: string;
  fileName: string;
  webViewLink: string;
  pages: PageText[];
}

function extractNodeText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (Array.isArray(node.children)) {
    return node.children.map(extractNodeText).join(' ');
  }
  return '';
}

/**
 * Extracts per-page/per-slide text from PDF, DOCX, and PPTX files.
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  driveFileId: string,
  webViewLink: string
): Promise<ExtractedDocument> {
  const pages: PageText[] = [];

  const normMime = (mimeType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  const isPdf = normMime === 'application/pdf' || lowerName.endsWith('.pdf');
  const isDocx =
    normMime.includes('wordprocessingml') ||
    normMime.includes('msword') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc');
  const isPptx =
    normMime.includes('presentationml') ||
    normMime.includes('powerpoint') ||
    lowerName.endsWith('.pptx') ||
    lowerName.endsWith('.ppt');

  if (isPdf) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    await (parser as any).load();

    const textObj = await parser.getText();
    if (textObj?.pages && Array.isArray(textObj.pages)) {
      textObj.pages.forEach((p: any, idx: number) => {
        const pageText = (p?.text ?? '').trim();
        pages.push({
          pageNumber: p?.num ?? idx + 1,
          text: pageText,
          isScanned: pageText.length < 100,
        });
      });
    }

    parser.destroy();
  } else if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const trimmed = (result.value || '').trim();
      pages.push({
        pageNumber: null, // DOCX files have no native page boundaries
        text: trimmed,
        isScanned: trimmed.length < 100,
      });
    } catch (err: any) {
      console.warn(`[extractText] Mammoth failed for ${fileName}:`, err.message);
    }
  } else if (isPptx) {
    try {
      const officeparser = await import('officeparser');
      const parseFn =
        (officeparser as any).parseOffice ||
        (officeparser as any).default?.parseOffice ||
        (officeparser as any).parseOfficeAsync;

      if (typeof parseFn === 'function') {
        const parsedObj = await parseFn(buffer);

        if (parsedObj && Array.isArray(parsedObj.content) && parsedObj.content.length > 0) {
          parsedObj.content.forEach((slideNode: any, idx: number) => {
            const slideText = extractNodeText(slideNode).trim();
            pages.push({
              pageNumber: idx + 1, // Slide 1, Slide 2, etc.
              text: slideText,
              isScanned: slideText.length < 100,
            });
          });
        } else if (typeof parsedObj?.toText === 'function') {
          const textStr = parsedObj.toText() || '';
          const slides = textStr.split(/\n\s*\n/).filter((s: string) => s.trim().length > 0);
          slides.forEach((slideText: string, idx: number) => {
            const trimmed = slideText.trim();
            pages.push({
              pageNumber: idx + 1,
              text: trimmed,
              isScanned: trimmed.length < 100,
            });
          });
        }
      }
    } catch (err: any) {
      console.warn(`[extractText] officeparser failed for ${fileName}:`, err.message);
    }
  }

  return {
    driveFileId,
    fileName,
    webViewLink,
    pages,
  };
}
