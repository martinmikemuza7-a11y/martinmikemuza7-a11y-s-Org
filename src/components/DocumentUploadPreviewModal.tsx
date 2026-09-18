import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileCode,
  ImageIcon,
  FolderIcon,
  Search,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Clock,
  BookOpen,
  Hash,
  X,
  Loader2,
  Brain,
  GraduationCap,
  Download,
} from 'lucide-react';
import { DocumentItem, DocumentChunk, Course, Folder } from '../types';

export interface PendingUploadItem {
  file?: File;
  id: string;
  filename: string;
  fileType: DocumentItem['fileType'];
  fileSize: number;
  text: string;
  pageCount: number;
  folderId?: string;
  chunks: DocumentChunk[];
}

interface DocumentUploadPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'upload' | 'view';
  course: Course;
  folders: Folder[];
  // Upload mode props
  pendingDocs?: PendingUploadItem[];
  onConfirmUpload?: (docs: PendingUploadItem[]) => Promise<void>;
  // View mode props
  viewDoc?: DocumentItem | null;
  viewChunks?: DocumentChunk[];
  onOpenQuestionGen?: (courseId: string) => void;
  onOpenTutor?: () => void;
}

export const DocumentUploadPreviewModal: React.FC<DocumentUploadPreviewModalProps> = ({
  isOpen,
  onClose,
  mode,
  course,
  folders,
  pendingDocs = [],
  onConfirmUpload,
  viewDoc,
  viewChunks = [],
  onOpenQuestionGen,
  onOpenTutor,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'text' | 'chunks' | 'summary'>('text');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
  const [selectedFolderIds, setSelectedFolderIds] = useState<Record<string, string | undefined>>({});

  if (!isOpen) return null;

  // Derive current document depending on mode
  const currentDoc: PendingUploadItem | null = useMemo(() => {
    if (mode === 'upload') {
      if (!pendingDocs.length) return null;
      const doc = pendingDocs[currentIndex] || pendingDocs[0];
      return {
        ...doc,
        filename: editedTitles[doc.id] ?? doc.filename,
        folderId: selectedFolderIds[doc.id] ?? doc.folderId,
      };
    } else if (viewDoc) {
      return {
        id: viewDoc.id,
        filename: viewDoc.filename,
        fileType: viewDoc.fileType,
        fileSize: viewDoc.fileSize,
        text: viewDoc.extractedText || '',
        pageCount: viewDoc.pageCount || 1,
        folderId: viewDoc.folderId,
        chunks: viewChunks,
      };
    }
    return null;
  }, [mode, pendingDocs, currentIndex, viewDoc, viewChunks, editedTitles, selectedFolderIds]);

  if (!currentDoc) return null;

  // Text statistics
  const wordCount = currentDoc.text.trim() ? currentDoc.text.trim().split(/\s+/).length : 0;
  const charCount = currentDoc.text.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Copy text helper
  const handleCopy = () => {
    navigator.clipboard.writeText(currentDoc.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Title change helper in upload mode
  const handleTitleChange = (newTitle: string) => {
    setEditedTitles((prev) => ({
      ...prev,
      [currentDoc.id]: newTitle,
    }));
  };

  // Folder change helper in upload mode
  const handleFolderChange = (folderId: string) => {
    setSelectedFolderIds((prev) => ({
      ...prev,
      [currentDoc.id]: folderId === 'root' ? undefined : folderId,
    }));
  };

  // Confirm upload of current single doc or all docs
  const handleConfirmSingle = async () => {
    if (!onConfirmUpload) return;
    setIsSubmitting(true);
    try {
      await onConfirmUpload([currentDoc]);
      onClose();
    } catch (err) {
      console.error('Error confirming upload:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAll = async () => {
    if (!onConfirmUpload) return;
    setIsSubmitting(true);
    try {
      const allUpdated = pendingDocs.map((doc) => ({
        ...doc,
        filename: editedTitles[doc.id] ?? doc.filename,
        folderId: selectedFolderIds[doc.id] ?? doc.folderId,
      }));
      await onConfirmUpload(allUpdated);
      onClose();
    } catch (err) {
      console.error('Error confirming all uploads:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter text highlighting
  const highlightedText = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.trim();
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return currentDoc.text.split(regex);
  }, [currentDoc.text, searchQuery]);

  // Extract key concept points for the summary tab
  const keyLines = useMemo(() => {
    return currentDoc.text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 25 && !l.startsWith('#'))
      .slice(0, 10);
  }, [currentDoc.text]);

  const getFormatBadge = (type: DocumentItem['fileType']) => {
    switch (type) {
      case 'pdf':
        return {
          bg: 'bg-rose-600',
          text: 'text-white',
          label: 'PDF Document',
          icon: FileText,
        };
      case 'docx':
        return {
          bg: 'bg-blue-600',
          text: 'text-white',
          label: 'Word Document',
          icon: FileText,
        };
      case 'pptx':
        return {
          bg: 'bg-amber-600',
          text: 'text-white',
          label: 'Slide Deck',
          icon: BookOpen,
        };
      case 'image':
        return {
          bg: 'bg-emerald-600',
          text: 'text-white',
          label: 'Image OCR',
          icon: ImageIcon,
        };
      default:
        return {
          bg: 'bg-purple-600',
          text: 'text-white',
          label: 'Plain / MD Note',
          icon: FileCode,
        };
    }
  };

  const badge = getFormatBadge(currentDoc.fileType);
  const BadgeIcon = badge.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col rounded-2xl border-2 border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${badge.bg} ${badge.text} shadow-md`}>
              <BadgeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
                <span className="rounded-md border border-slate-300 bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Course: {course.name}
                </span>
                {mode === 'upload' && (
                  <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    Preview Before Indexing
                  </span>
                )}
              </div>
              <h2 className="mt-1 font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {currentDoc.filename}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mode === 'upload' && pendingDocs.length > 1 && (
              <div className="flex items-center gap-1 rounded-xl border-2 border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Previous document"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  {currentIndex + 1} of {pendingDocs.length}
                </span>
                <button
                  disabled={currentIndex === pendingDocs.length - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(pendingDocs.length - 1, prev + 1))}
                  className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Next document"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Metrics & Meta Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 rounded-xl border border-sky-300 bg-sky-50 p-2.5 dark:border-sky-800 dark:bg-sky-950/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-sky-800 dark:text-sky-300">File Size</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {Math.round(currentDoc.fileSize / 1024)} KB
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-indigo-300 bg-indigo-50 p-2.5 dark:border-indigo-800 dark:bg-indigo-950/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300">Pages / Length</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {currentDoc.pageCount} Pages • ~{readingTimeMin}m read
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 dark:border-emerald-800 dark:bg-emerald-950/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Word Count</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {wordCount.toLocaleString()} words
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-violet-300 bg-violet-50 p-2.5 dark:border-violet-800 dark:bg-violet-950/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-violet-800 dark:text-violet-300">AI RAG Chunks</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {currentDoc.chunks.length} Semantic Chunks
              </div>
            </div>
          </div>
        </div>

        {/* Upload Mode: Inline Name & Folder Assignment */}
        {mode === 'upload' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-5 py-3 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shrink-0">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={currentDoc.filename}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Name your document..."
                className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="w-full sm:w-64">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assign to Folder
              </label>
              <div className="relative">
                <FolderIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-amber-500" />
                <select
                  value={currentDoc.folderId || 'root'}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                >
                  <option value="root">📁 Root (All Materials)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📂 {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* View Controls & Sub-Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-2.5 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'text'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Full Text Preview</span>
            </button>

            <button
              onClick={() => setActiveTab('chunks')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'chunks'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Semantic Chunks ({currentDoc.chunks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'summary'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Key Concepts</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'text' && (
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find inside document..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
              title="Copy text to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-950">
          {activeTab === 'text' && (
            <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              {currentDoc.text.trim() ? (
                <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 select-text">
                  {highlightedText ? (
                    highlightedText.map((part, i) =>
                      part.toLowerCase() === searchQuery.toLowerCase() ? (
                        <mark key={i} className="bg-amber-300 text-slate-950 font-bold px-0.5 rounded">
                          {part}
                        </mark>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )
                  ) : (
                    currentDoc.text
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs">No readable text could be extracted from this file.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chunks' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200">
                <span className="font-bold">How AI RAG Chunking Works:</span> This document is split into{' '}
                <span className="font-bold">{currentDoc.chunks.length} semantic chunks</span>. When you ask the AI Tutor or take active recall quizzes, StudyBuddy matches your questions directly to these specific chunks for accurate, citation-backed answers.
              </div>

              {currentDoc.chunks.map((chunk, idx) => {
                const chunkText = chunk.text || '';
                const chunkWords = chunkText.trim().split(/\s+/).filter(Boolean).length;
                return (
                  <div
                    key={chunk.id || idx}
                    className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          Chunk #{idx + 1}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {chunkWords} words • ~{chunkText.length} characters
                        </span>
                      </div>
                      {chunk.pageNumber && (
                        <span className="text-[10px] font-bold text-slate-400">
                          Page {chunk.pageNumber}
                        </span>
                      )}
                    </div>
                    <p className="mt-2.5 font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {chunkText}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  Key Sections & Study Highlights
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Salient concepts detected in this material for active recall practice:
                </p>

                <div className="mt-4 space-y-2">
                  {keyLines.length > 0 ? (
                    keyLines.map((line, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="leading-normal">{line}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No structured highlight lines found.</p>
                  )}
                </div>
              </div>

              {mode === 'view' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenQuestionGen) onOpenQuestionGen(course.id);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 p-4 font-bold text-xs text-white shadow-md hover:bg-violet-700 transition"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Generate Practice Questions from this Note</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenTutor) onOpenTutor();
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-4 font-bold text-xs text-white shadow-md hover:bg-blue-700 transition"
                  >
                    <Brain className="h-4 w-4" />
                    <span>Chat with AI Tutor about this Material</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {mode === 'upload' ? 'Verify text preview before indexing' : 'Document ready for active recall'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            >
              {mode === 'upload' ? 'Cancel' : 'Close'}
            </button>

            {mode === 'upload' && (
              <>
                {pendingDocs.length > 1 && (
                  <button
                    onClick={handleConfirmAll}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>Confirm & Index All ({pendingDocs.length})</span>
                  </button>
                )}

                <button
                  onClick={handleConfirmSingle}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {pendingDocs.length > 1 ? `Confirm & Index Current File` : `Confirm & Index Document`}
                  </span>
                </button>
              </>
            )}

            {mode === 'view' && (
              <button
                onClick={onClose}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
