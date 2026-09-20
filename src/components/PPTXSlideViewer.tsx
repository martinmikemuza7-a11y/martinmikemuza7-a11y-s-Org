import React, { useState } from 'react';
import { DocumentPage } from '../types';
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Table as TableIcon,
} from 'lucide-react';

interface PPTXSlideViewerProps {
  filename: string;
  pages: DocumentPage[];
  initialSlide?: number;
  onSlideChange?: (slideIndex: number) => void;
}

export const PPTXSlideViewer: React.FC<PPTXSlideViewerProps> = ({
  filename,
  pages = [],
  initialSlide = 0,
  onSlideChange,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(initialSlide);
  const slides = pages.length > 0 ? pages : [{ pageNumber: 1, title: 'Slide 1', text: 'Slide content ready for study.' }];
  const activeSlide = slides[currentSlideIndex] || slides[0];

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      const prev = currentSlideIndex - 1;
      setCurrentSlideIndex(prev);
      if (onSlideChange) onSlideChange(prev);
    }
  };

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      const next = currentSlideIndex + 1;
      setCurrentSlideIndex(next);
      if (onSlideChange) onSlideChange(next);
    }
  };

  // Parse slide text for tables, bullet items, and speaker notes
  const lines = (activeSlide.text || '').split('\n').filter((l) => l.trim().length > 0);
  const titleLine = activeSlide.title || lines[0]?.replace(/^##\s*/, '') || `Slide ${currentSlideIndex + 1}`;
  
  const contentLines = lines.filter((l) => !l.startsWith('## '));
  const tableRows: string[][] = [];
  const bulletItems: string[] = [];
  let speakerNotes = '';

  for (const line of contentLines) {
    if (line.includes('**Speaker Notes:**')) {
      speakerNotes = line.replace(/.*?Speaker Notes:\*\*/, '').trim();
    } else if (line.startsWith('[Table Row]:')) {
      const cells = line.replace(/^\[Table Row\]:\s*/, '').split('|').map((c) => c.trim());
      tableRows.push(cells);
    } else {
      const clean = line.replace(/^[•\-\*]\s*/, '').trim();
      if (clean) {
        bulletItems.push(clean);
      }
    }
  }

  return (
    <div className="flex flex-col space-y-3">
      {/* Slide Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Presentation className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>
          <span className="hidden text-xs text-slate-400 sm:inline truncate max-w-xs">
            — {titleLine}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Prev</span>
          </button>

          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            {currentSlideIndex + 1} / {slides.length}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlideIndex === slides.length - 1}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 16:9 Presentation Canvas Frame */}
      <div className="relative rounded-2xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl text-white min-h-[360px] flex flex-col justify-between overflow-hidden">
        {/* Subtle Slide Background Watermark */}
        <div className="pointer-events-none absolute right-4 top-4 opacity-5">
          <Presentation className="h-64 w-64" />
        </div>

        <div>
          {/* Slide Header Strip */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase tracking-wider">
              Slide {currentSlideIndex + 1}
            </span>
            <span className="text-[11px] font-bold text-slate-400 truncate max-w-sm">
              {filename}
            </span>
          </div>

          {/* Slide Title */}
          <h3 className="mt-5 text-lg sm:text-xl font-black tracking-tight text-white">
            {titleLine}
          </h3>

          {/* Slide Bullet Points */}
          {bulletItems.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {bulletItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Slide Tables if present */}
          {tableRows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2">
              <table className="w-full text-left text-xs text-slate-200">
                <tbody>
                  {tableRows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-800/80 last:border-0">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 font-medium">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Slide Footer */}
        <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>StudyBuddy AI Presentation Viewer</span>
          <span className="font-mono">{currentSlideIndex + 1} of {slides.length}</span>
        </div>
      </div>

      {/* Speaker Notes if extracted */}
      {speakerNotes && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="font-bold flex items-center gap-1 mb-1">
            <FileText className="h-3.5 w-3.5" />
            Slide Notes:
          </span>
          <p className="leading-relaxed">{speakerNotes}</p>
        </div>
      )}

      {/* Quick Slide Carousel Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {slides.map((slide, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCurrentSlideIndex(idx);
              if (onSlideChange) onSlideChange(idx);
            }}
            className={`flex-shrink-0 w-32 rounded-xl border p-2 text-left transition cursor-pointer ${
              currentSlideIndex === idx
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <span className="block text-[10px] font-black text-amber-600 dark:text-amber-400">
              Slide {idx + 1}
            </span>
            <span className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
              {slide.title || `Slide ${idx + 1}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
