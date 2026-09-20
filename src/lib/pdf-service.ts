import * as pdfjsLib from 'pdfjs-dist';
import { DocumentPage } from '../types';

// Configure PDF.js worker securely with fallback
if (typeof window !== 'undefined') {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

/**
 * Safely load a PDF Document proxy from ArrayBuffer, Uint8Array, or Blob.
 */
export async function loadPDFDocument(source: ArrayBuffer | Uint8Array | Blob): Promise<pdfjsLib.PDFDocumentProxy> {
  let data: ArrayBuffer;
  if (source instanceof Blob) {
    data = await source.arrayBuffer();
  } else if (source instanceof Uint8Array) {
    data = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer;
  } else {
    data = source;
  }

  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  });

  return await loadingTask.promise;
}

export interface PDFExtractionResult {
  pageCount: number;
  pages: DocumentPage[];
  fullText: string;
  isScanned: boolean;
}

/**
 * Extract genuine academic text from a PDF page-by-page.
 * Streaming and memory-safe: each page's text is extracted, control is yielded
 * to avoid UI freeze, and page memory is cleaned up immediately.
 */
export async function extractPDFContent(
  source: ArrayBuffer | Blob,
  onProgress?: (current: number, total: number) => void
): Promise<PDFExtractionResult> {
  const pdfDoc = await loadPDFDocument(source);
  const pageCount = pdfDoc.numPages;
  const pages: DocumentPage[] = [];
  let totalChars = 0;

  try {
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Join items with whitespace awareness
      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        // Check if on a new line
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      const cleanText = pageText.trim();
      totalChars += cleanText.length;

      pages.push({
        pageNumber: pageNum,
        title: `Page ${pageNum}`,
        text: cleanText,
      });

      // Release page memory immediately
      page.cleanup();

      if (onProgress) {
        onProgress(pageNum, pageCount);
      }

      // Yield event loop between pages so the browser remains responsive
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const fullText = pages
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join('\n\n');

    // Scanned PDF detection: if average characters per page is less than 25, it is an image/scanned PDF
    const avgCharsPerPage = pageCount > 0 ? totalChars / pageCount : 0;
    const isScanned = avgCharsPerPage < 25;

    return {
      pageCount,
      pages,
      fullText,
      isScanned,
    };
  } finally {
    try {
      pdfDoc.cleanup();
      if (typeof (pdfDoc as any).destroy === 'function') {
        (pdfDoc as any).destroy();
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

export interface RenderPageResult {
  width: number;
  height: number;
  scale: number;
  cancel: () => void;
}

/**
 * Render an authentic PDF page onto an HTML5 Canvas with high-DPI scaling,
 * zoom, fit-to-width/fit-to-page, and abortable rendering task.
 */
export async function renderPDFPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options: {
    zoomScale?: number;
    fitWidth?: boolean;
    containerWidth?: number;
    containerHeight?: number;
  } = {}
): Promise<RenderPageResult> {
  const page = await pdfDoc.getPage(pageNumber);

  try {
    const defaultViewport = page.getViewport({ scale: 1.0 });
    let scale = options.zoomScale || 1.0;

    if (options.fitWidth && options.containerWidth) {
      // Fit to container width with 32px padding
      const availableWidth = Math.max(200, options.containerWidth - 32);
      scale = availableWidth / defaultViewport.width;
    }

    // Clamp scale to safe view boundaries
    scale = Math.max(0.3, Math.min(3.5, scale));

    const viewport = page.getViewport({ scale });
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    // Draw clean background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    const renderTask = (page as any).render({
      canvasContext: ctx,
      viewport,
      canvas,
    });

    const cancel = () => {
      try {
        renderTask.cancel();
      } catch {
        // Ignore cancellation error
      }
    };

    await renderTask.promise;
    ctx.restore();

    return {
      width: viewport.width,
      height: viewport.height,
      scale,
      cancel,
    };
  } finally {
    page.cleanup();
  }
}
