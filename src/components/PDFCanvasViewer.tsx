import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPDFDocument, renderPDFPageToCanvas } from '../lib/pdf-service';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface PDFCanvasViewerProps {
  source: Blob | ArrayBuffer | File | null;
  filename: string;
  initialPage?: number;
  onPageChange?: (page: number, total: number) => void;
}

export const PDFCanvasViewer: React.FC<PDFCanvasViewerProps> = ({
  source,
  filename,
  initialPage = 1,
  onPageChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Active cancel handler for currently rendering page
  const activeCancelRef = useRef<(() => void) | null>(null);

  // Load PDF Document when source changes
  useEffect(() => {
    let isMounted = true;
    if (!source) {
      setIsLoading(false);
      setErrorMessage('No PDF data available to render.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    loadPDFDocument(source)
      .then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(Math.min(initialPage, doc.numPages));
        setIsLoading(false);
        if (onPageChange) {
          onPageChange(Math.min(initialPage, doc.numPages), doc.numPages);
        }
      })
      .catch((err) => {
        console.error('Failed to load PDF document:', err);
        if (!isMounted) return;
        setIsLoading(false);
        setErrorMessage(
          'Unable to render visual PDF canvas. The document may be password-protected or corrupted.'
        );
      });

    return () => {
      isMounted = false;
      if (activeCancelRef.current) {
        try {
          activeCancelRef.current();
        } catch {}
      }
    };
  }, [source]);

  // Render current page onto canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > numPages) return;

    if (activeCancelRef.current) {
      try {
        activeCancelRef.current();
      } catch {}
      activeCancelRef.current = null;
    }

    setIsRendering(true);

    try {
      const containerWidth = containerRef.current?.clientWidth || 800;
      const renderTask = await renderPDFPageToCanvas(
        pdfDoc,
        currentPage,
        canvasRef.current,
        {
          zoomScale,
          fitWidth: fitMode === 'width',
          containerWidth,
        }
      );

      activeCancelRef.current = renderTask.cancel;
    } catch (err: any) {
      // Ignore rendering cancellation from rapid page navigation
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('PDF canvas render warning:', err);
      }
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, currentPage, numPages, zoomScale, fitMode]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      if (onPageChange) onPageChange(prev, numPages);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      if (onPageChange) onPageChange(next, numPages);
    }
  };

  const handleFitToWidth = () => {
    setFitMode('width');
    setZoomScale(1.0);
  };

  const handleZoomIn = () => {
    setFitMode('custom');
    setZoomScale((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setZoomScale((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  };

  const handleResetZoom = () => {
    setFitMode('custom');
    setZoomScale(1.0);
  };

  if (isLoading) {
    return (
      <div className="flex h-80 flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/60">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
          Loading authentic PDF document pages...
        </p>
        <span className="mt-1 text-[11px] text-slate-500">{filename}</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/20">
        <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
        <h4 className="mt-2 text-sm font-black text-rose-900 dark:text-rose-200">
          Visual Preview Notice
        </h4>
        <p className="mt-1 max-w-md text-xs font-medium text-rose-800/90 dark:text-rose-300">
          {errorMessage}
        </p>
        <span className="mt-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
          Use the "Extracted Text" tab to review document contents.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3" ref={containerRef}>
      {/* PDF Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  setCurrentPage(val);
                  if (onPageChange) onPageChange(val, numPages);
                }
              }}
              className="w-12 rounded-md border border-slate-300 px-1.5 py-0.5 text-center font-mono text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <span>of {numPages}</span>
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom & Display Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFitToWidth}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              fitMode === 'width'
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
            }`}
            title="Fit to Container Width"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit Width</span>
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomScale <= 0.5}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="rounded-lg border border-slate-200 px-2 py-1 font-mono text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Reset to 100%"
          >
            {Math.round(zoomScale * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomScale >= 3.0}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Real PDF Canvas Render Stage */}
      <div className="relative flex min-h-[380px] max-h-[620px] items-center justify-center overflow-auto rounded-2xl border-2 border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950/80">
        {isRendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-xs dark:bg-slate-900/60">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="rounded-xl border border-slate-300 shadow-xl transition-all duration-150 dark:border-slate-700"
        />
      </div>

      {/* Page Jump Thumbnails Strip */}
      {numPages > 1 && (
        <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setCurrentPage(p);
                if (onPageChange) onPageChange(p, numPages);
              }}
              className={`flex h-8 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition cursor-pointer ${
                currentPage === p
                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
