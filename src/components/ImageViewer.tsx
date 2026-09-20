import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Sparkles,
  ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ImageViewerProps {
  src: string;
  filename: string;
  extractedOCRText?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  filename,
  extractedOCRText,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showOCRCard, setShowOCRCard] = useState<boolean>(true);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleReset = () => setZoomLevel(1.0);

  return (
    <div className="flex flex-col space-y-3">
      {/* Zoom Toolbar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
            {filename}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-200 px-2 py-1 font-mono text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Reset 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3.0}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Image Stage Container */}
      <div className="relative flex min-h-[340px] max-h-[580px] items-center justify-center overflow-auto rounded-2xl border-2 border-slate-200 bg-slate-900/10 p-4 dark:border-slate-800 dark:bg-black/40">
        <img
          src={src}
          alt={filename}
          referrerPolicy="no-referrer"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          className="max-h-[520px] w-auto rounded-xl object-contain shadow-xl transition-transform duration-150"
        />
      </div>

      {/* Dedicated Extracted OCR Text Card (Separated from the authentic image) */}
      {extractedOCRText && extractedOCRText.trim().length > 0 && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div
            className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
            onClick={() => setShowOCRCard(!showOCRCard)}
          >
            <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Extracted Academic OCR Text
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Separately preserved for RAG & questions
              </span>
              {showOCRCard ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
            </div>
          </div>

          {showOCRCard && (
            <div className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
              {extractedOCRText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
