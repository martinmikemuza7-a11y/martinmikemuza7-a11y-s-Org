import { DocumentItem } from '../types';

export interface ParseResult {
  text: string;
  pageCount?: number;
  fileType: DocumentItem['fileType'];
}

// Client-side parser for multiple academic file types
export async function parseUploadedFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'txt' || extension === 'md' || extension === 'markdown' || extension === 'json' || extension === 'csv') {
    const text = await file.text();
    return {
      text,
      fileType: 'txt',
      pageCount: Math.ceil(text.length / 1800),
    };
  }

  if (extension === 'pdf') {
    return await parsePDFFile(file);
  }

  if (extension === 'pptx' || extension === 'ppt') {
    return await parsePresentationFile(file);
  }

  if (extension === 'docx' || extension === 'doc') {
    return await parseDocxFile(file);
  }

  if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension)) {
    return await parseImageOCR(file);
  }

  // Fallback generic text attempt
  try {
    const text = await file.text();
    return {
      text,
      fileType: 'other',
      pageCount: 1,
    };
  } catch {
    throw new Error(`Unsupported file type: .${extension}`);
  }
}

// PDF text & structure extraction
async function parsePDFFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Decode binary stream looking for PDF text streams (/Font, BT...ET blocks)
  let extractedText = '';
  let pageCount = 0;

  // Search for /Type /Page
  const decoder = new TextDecoder('latin1');
  const rawString = decoder.decode(uint8);

  const pageMatches = rawString.match(/\/Type\s*\/Page\b/g);
  pageCount = pageMatches ? pageMatches.length : 1;

  // Extract text within BT...ET blocks
  const btRegex = /BT[\s\S]*?ET/g;
  const matches = rawString.match(btRegex);

  if (matches && matches.length > 0) {
    const pagesMap = new Map<number, string[]>();

    matches.forEach((btBlock, idx) => {
      // Look for strings enclosed in parentheses (Text) or brackets [(T)(e)(x)(t)]
      const tjMatches = btBlock.match(/\((.*?)\)\s*T[jJ]|\[(.*?)\]\s*TJ/g);
      if (tjMatches) {
        const textParts = tjMatches
          .map((tj) => {
            const inner = tj.replace(/^\[|\s*TJ$|\s*T[jJ]$|^\(|\)$/g, '');
            return inner
              .replace(/\\([()\\])/g, '$1')
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, ' ')
              .replace(/\\t/g, ' ');
          })
          .filter((t) => t.trim().length > 0);

        const pageNum = Math.min(pageCount, Math.floor((idx / matches.length) * pageCount) + 1);
        if (!pagesMap.has(pageNum)) pagesMap.set(pageNum, []);
        pagesMap.get(pageNum)!.push(textParts.join(' '));
      }
    });

    for (let p = 1; p <= pageCount; p++) {
      const pageLines = pagesMap.get(p);
      if (pageLines && pageLines.length > 0) {
        extractedText += `--- Page ${p} ---\n` + pageLines.join('\n') + '\n\n';
      }
    }
  }

  // If streams were compressed or unreadable directly, extract readable string runs
  if (!extractedText.trim() || extractedText.length < 50) {
    const textRuns = rawString
      .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .match(/[A-Z0-9][A-Za-z0-9\s,.:;'"\-?!()]{15,}/g);

    if (textRuns) {
      extractedText = textRuns.slice(0, 150).join('\n\n');
    } else {
      extractedText = `Document: ${file.name}\nImported PDF document. Ready for question generation and study.`;
    }
  }

  return {
    text: extractedText,
    pageCount: Math.max(1, pageCount),
    fileType: 'pdf',
  };
}

// PPTX / Presentation text extraction
async function parsePresentationFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const rawString = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer));

  // In standard OOXML pptx, slide text resides in <a:t> elements
  const textMatches = rawString.match(/<a:t>([\s\S]*?)<\/a:t>/g);
  let text = '';
  let slideCount = 1;

  if (textMatches && textMatches.length > 0) {
    const slideTexts: string[] = [];
    let currentSlide: string[] = [];

    textMatches.forEach((m, idx) => {
      const clean = m.replace(/<[^>]+>/g, '').trim();
      if (clean) currentSlide.push(clean);

      if ((idx + 1) % 6 === 0 || idx === textMatches.length - 1) {
        slideTexts.push(`--- Slide ${slideCount} ---\n` + currentSlide.join('\n'));
        currentSlide = [];
        slideCount++;
      }
    });

    text = slideTexts.join('\n\n');
  } else {
    // String run fallback
    const readable = rawString
      .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
      .match(/[A-Za-z0-9][A-Za-z0-9\s,.:;\-?!()]{12,}/g);
    text = readable ? readable.slice(0, 80).join('\n') : `Presentation notes for ${file.name}`;
    slideCount = Math.max(1, Math.ceil(text.length / 500));
  }

  return {
    text,
    pageCount: slideCount,
    fileType: 'pptx',
  };
}

// DOCX / Word extraction
async function parseDocxFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const rawString = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer));

  // In docx OOXML, text is in <w:t> elements and paragraphs are <w:p>
  const wPRegex = /<w:p[\s\S]*?<\/w:p>/g;
  const pMatches = rawString.match(wPRegex);

  let text = '';
  if (pMatches && pMatches.length > 0) {
    const paragraphs = pMatches
      .map((pXml) => {
        const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
        if (!tMatches) return '';
        return tMatches.map((t) => t.replace(/<[^>]+>/g, '')).join('');
      })
      .filter((p) => p.trim().length > 0);

    text = paragraphs.join('\n\n');
  } else {
    const readable = rawString
      .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
      .match(/[A-Za-z0-9][A-Za-z0-9\s,.:;\-?!()]{15,}/g);
    text = readable ? readable.slice(0, 100).join('\n\n') : `Text content from ${file.name}`;
  }

  return {
    text,
    pageCount: Math.max(1, Math.ceil(text.length / 1500)),
    fileType: 'docx',
  };
}

// OCR for study note images (handwritten or typed lecture slides)
async function parseImageOCR(file: File): Promise<ParseResult> {
  // Try cloud Gemini OCR first if online
  if (navigator.onLine) {
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: base64,
          mimeType: file.type || 'image/jpeg',
          filename: file.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          return {
            text: `[OCR Extracted from ${file.name}]\n\n${data.text}`,
            pageCount: 1,
            fileType: 'image',
          };
        }
      }
    } catch {
      // Fall through to offline fallback
    }
  }

  // Offline Image parsing fallback: metadata & canvas description
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        text: `[Image Document: ${file.name}]\nResolution: ${img.width}x${img.height}px\nStatus: Image indexed for study visual reference. When online, cloud OCR can re-extract full text details.`,
        pageCount: 1,
        fileType: 'image',
      });
    };
    img.onerror = () => {
      resolve({
        text: `[Image Document: ${file.name}]\nImage uploaded and stored in course library.`,
        pageCount: 1,
        fileType: 'image',
      });
    };
    img.src = url;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
