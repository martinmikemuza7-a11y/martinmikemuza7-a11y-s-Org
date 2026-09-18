import { DocumentChunk, DocumentItem } from '../types';
import { getByIndex, openDB } from './db';

// Term extraction and normalization
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Compute simple TF-IDF / Term Frequency vector for cosine similarity
export function computeTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  return tf;
}

// Cosine similarity between query TF and document chunk TF
export function calculateCosineSimilarity(
  queryTf: Map<string, number>,
  chunkTf: Map<string, number>
): number {
  let dotProduct = 0;
  let queryNorm = 0;
  let chunkNorm = 0;

  for (const [term, qCount] of queryTf.entries()) {
    queryNorm += qCount * qCount;
    const cCount = chunkTf.get(term) || 0;
    dotProduct += qCount * cCount;
  }

  for (const [, cCount] of chunkTf.entries()) {
    chunkNorm += cCount * cCount;
  }

  if (queryNorm === 0 || chunkNorm === 0) return 0;
  return dotProduct / (Math.sqrt(queryNorm) * Math.sqrt(chunkNorm));
}

// BM25 scoring algorithm for local offline full-text search
export function scoreBM25(
  queryTokens: string[],
  chunkTokens: string[],
  avgDocLen: number,
  k1 = 1.5,
  b = 0.75
): number {
  const docLen = chunkTokens.length;
  const chunkTokenSet = new Set(chunkTokens);
  let score = 0;

  for (const qt of queryTokens) {
    if (chunkTokenSet.has(qt)) {
      // Frequency of qt in chunk
      const tf = chunkTokens.filter((t) => t === qt).length;
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / (avgDocLen || 100)));
      score += numerator / (denominator || 1);
    }
  }

  return score;
}

// Chunking algorithm with sentence boundary preservation and metadata attribution
export function chunkDocumentText(
  document: DocumentItem,
  chunkSize = 600,
  overlap = 120
): Omit<DocumentChunk, 'id'>[] {
  const text = document.extractedText || '';
  if (!text.trim()) return [];

  // Split by pages/slides if markers exist, otherwise split by paragraphs
  const pageDelimiters = /--- Page (\d+) ---|--- Slide (\d+) ---/gi;
  const hasPageMarkers = pageDelimiters.test(text);

  const chunks: Omit<DocumentChunk, 'id'>[] = [];

  if (hasPageMarkers) {
    const rawPages = text.split(/--- (?:Page|Slide) \d+ ---/i);
    let currentPage = 1;
    for (let pIdx = 0; pIdx < rawPages.length; pIdx++) {
      const pageText = rawPages[pIdx].trim();
      if (!pageText) continue;

      const subChunks = chunkSlice(pageText, chunkSize, overlap);
      subChunks.forEach((sc, i) => {
        chunks.push({
          documentId: document.id,
          courseId: document.courseId,
          subjectId: document.subjectId,
          folderId: document.folderId,
          filename: document.filename,
          pageNumber: currentPage,
          chunkIndex: chunks.length,
          text: sc,
          tokensCount: sc.split(/\s+/).length,
        });
      });
      currentPage++;
    }
  } else {
    const subChunks = chunkSlice(text, chunkSize, overlap);
    subChunks.forEach((sc, i) => {
      // Estimate page number every ~1500 characters
      const estimatedPage = Math.floor((i * (chunkSize - overlap)) / 1500) + 1;
      chunks.push({
        documentId: document.id,
        courseId: document.courseId,
        subjectId: document.subjectId,
        folderId: document.folderId,
        filename: document.filename,
        pageNumber: estimatedPage,
        chunkIndex: i,
        text: sc,
        tokensCount: sc.split(/\s+/).length,
      });
    });
  }

  return chunks;
}

function chunkSlice(text: string, chunkSize: number, overlap: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const result: string[] = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    const cleanP = p.trim();
    if (!cleanP) continue;

    if ((currentChunk + '\n\n' + cleanP).length <= chunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + cleanP : cleanP;
    } else {
      if (currentChunk) {
        result.push(currentChunk);
        // keep overlap from end of currentChunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 6)).join(' ');
        currentChunk = overlapWords + '\n\n' + cleanP;
      } else {
        // paragraph alone is longer than chunkSize, slice directly
        let start = 0;
        while (start < cleanP.length) {
          result.push(cleanP.slice(start, start + chunkSize));
          start += chunkSize - overlap;
        }
      }
    }
  }

  if (currentChunk.trim()) {
    result.push(currentChunk.trim());
  }

  return result;
}

// Scoped RAG Search with strict Course Isolation
export async function searchCourseKnowledgeBase(
  courseId: string,
  query: string,
  topK = 5,
  folderId?: string
): Promise<DocumentChunk[]> {
  const allCourseChunks = await getByIndex<DocumentChunk>('chunks', 'courseId', courseId);
  if (!allCourseChunks || allCourseChunks.length === 0) return [];

  const candidateChunks = folderId
    ? allCourseChunks.filter((c) => c.folderId === folderId)
    : allCourseChunks;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return candidateChunks.slice(0, topK);
  }

  const queryTf = computeTermFrequency(queryTokens);
  const avgDocLen =
    candidateChunks.reduce((acc, c) => acc + (c.text.length / 5), 0) /
    (candidateChunks.length || 1);

  const scored = candidateChunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    const chunkTf = computeTermFrequency(chunkTokens);

    const cosine = calculateCosineSimilarity(queryTf, chunkTf);
    const bm25 = scoreBM25(queryTokens, chunkTokens, avgDocLen);

    const finalScore = cosine * 0.6 + (bm25 / 10) * 0.4;
    return { chunk, score: finalScore };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top matches above threshold or top 2 minimum
  return scored
    .filter((item, index) => item.score > 0.05 || index < 2)
    .slice(0, topK)
    .map((item) => item.chunk);
}

// Format citations e.g. "Biology Notes.pdf — Page 12"
export function formatCitation(chunk: DocumentChunk): string {
  const pageStr = chunk.pageNumber ? ` — Page ${chunk.pageNumber}` : '';
  return `${chunk.filename}${pageStr}`;
}
