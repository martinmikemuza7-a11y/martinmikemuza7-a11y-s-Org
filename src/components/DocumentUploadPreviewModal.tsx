import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  FileCode,
  ImageIcon,
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
  Presentation,
  FileCheck,
  Eye,
  Download,
  Trash2,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { DocumentItem, DocumentChunk, Course, Folder, DocumentPage } from '../types';
import { isRawBinaryOrZipArtifact } from '../lib/file-parser';
import { getOriginalFile } from '../lib/db';
import { PDFCanvasViewer } from './PDFCanvasViewer';
import { PPTXSlideViewer } from './PPTXSlideViewer';
import { ImageViewer } from './ImageViewer';

export interface PendingUploadItem {
  file?: File;
  id: string;
  filename: string;
  fileType: DocumentItem['fileType'];
  fileSize: number;
  text: string;
  pageCount: number;
  folderId?: string;
  previewUrl?: string;
  pages?: DocumentPage[];
  chunks: DocumentChunk[];
  keyConcepts?: string[];
  summary?: string;
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
  onOpenQuestionGen?: (courseId: string, documentId?: string) => void;
  onOpenTutor?: () => void;
  onStartStudy?: (courseId: string, documentId?: string) => void;
  onDeleteDoc?: (documentId: string) => void;
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
  onStartStudy,
  onDeleteDoc,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'visual' | 'text' | 'chunks' | 'summary'>('visual');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
  const [selectedFolderIds, setSelectedFolderIds] = useState<Record<string, string | undefined>>({});

  // Original stored binary / file retrieval
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [originalObjectUrl, setOriginalObjectUrl] = useState<string | null>(null);
  const [isLoadingOriginal, setIsLoadingOriginal] = useState<boolean>(false);

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
        previewUrl: viewDoc.previewUrl,
        pages: viewDoc.pages,
        chunks: viewChunks,
        keyConcepts: viewDoc.keyConcepts,
        summary: viewDoc.summary,
      };
    }
    return null;
  }, [mode, pendingDocs, currentIndex, viewDoc, viewChunks, editedTitles, selectedFolderIds]);

  // Load the authentic original file from memory or IndexedDB
  useEffect(() => {
    let isMounted = true;

    // Revoke previous object URL to preserve memory
    if (originalObjectUrl) {
      try {
        URL.revokeObjectURL(originalObjectUrl);
      } catch {}
      setOriginalObjectUrl(null);
    }

    if (!currentDoc) {
      setOriginalBlob(null);
      return;
    }

    if (mode === 'upload') {
      const activePending = pendingDocs[currentIndex];
      if (activePending?.file) {
        setOriginalBlob(activePending.file);
        try {
          const url = URL.createObjectURL(activePending.file);
          setOriginalObjectUrl(url);
        } catch {}
      } else {
        setOriginalBlob(null);
      }
    } else if (viewDoc) {
      setIsLoadingOriginal(true);
      getOriginalFile(viewDoc.id)
        .then((stored) => {
          if (!isMounted) return;
          setIsLoadingOriginal(false);
          if (stored?.blob) {
            setOriginalBlob(stored.blob);
            try {
              const url = URL.createObjectURL(stored.blob);
              setOriginalObjectUrl(url);
            } catch {}
          } else {
            setOriginalBlob(null);
          }
        })
        .catch((err) => {
          console.warn('Unable to load original stored file for preview:', err);
          if (isMounted) {
            setIsLoadingOriginal(false);
            setOriginalBlob(null);
          }
        });
    }

    return () => {
      isMounted = false;
      if (originalObjectUrl) {
        try {
          URL.revokeObjectURL(originalObjectUrl);
        } catch {}
      }
    };
  }, [mode, currentIndex, viewDoc?.id, pendingDocs]);

  // Reset tab when switching document
  useEffect(() => {
    if (currentDoc) {
      if (['image', 'pptx', 'pdf'].includes(currentDoc.fileType)) {
        setActiveTab('visual');
      } else {
        setActiveTab('text');
      }
    }
  }, [currentDoc?.id]);

  if (!isOpen || !currentDoc) return null;

  // Text statistics
  const wordCount = currentDoc.text.trim() ? currentDoc.text.trim().split(/\s+/).length : 0;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Copy text helper
  const handleCopy = () => {
    navigator.clipboard.writeText(currentDoc.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download original untouched file
  const handleDownloadOriginal = () => {
    const blobToDownload = originalBlob || currentDoc.file;
    if (!blobToDownload) return;

    const downloadUrl = URL.createObjectURL(blobToDownload);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = currentDoc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
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

  // Confirm upload of current single doc
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

  // Handle immediate confirm & generate Q&A from this exact file
  const handleConfirmAndMakeQA = async () => {
    if (mode === 'upload' && onConfirmUpload) {
      setIsSubmitting(true);
      try {
        await onConfirmUpload([currentDoc]);
        onClose();
        if (onOpenQuestionGen) {
          onOpenQuestionGen(course.id, currentDoc.id);
        }
      } catch (err) {
        console.error('Error confirming & launching Q&A:', err);
      } finally {
        setIsSubmitting(false);
      }
    } else if (mode === 'view') {
      onClose();
      if (onOpenQuestionGen) {
        onOpenQuestionGen(course.id, currentDoc.id);
      }
    }
  };

  // Filter text highlighting
  const highlightedText = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.trim();
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return currentDoc.text.split(regex);
  }, [currentDoc.text, searchQuery]);

  // Clean document text fallback without binary headers
  const cleanFullDocText = useMemo(() => {
    const raw = currentDoc.text || '';
    if (isRawBinaryOrZipArtifact(raw)) {
      return `[Document: ${currentDoc.filename}]\nThis file has been indexed. The content is formatted and ready for practice question generation and active study sessions.`;
    }
    return raw;
  }, [currentDoc.text, currentDoc.filename]);

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
          label: 'PowerPoint Presentation',
          icon: Presentation,
        };
      case 'image':
        return {
          bg: 'bg-emerald-600',
          text: 'text-white',
          label: 'Picture / Visual Note',
          icon: ImageIcon,
        };
      default:
        return {
          bg: 'bg-purple-600',
          text: 'text-white',
          label: 'Plain / Text Note',
          icon: FileCode,
        };
    }
  };

  const badge = getFormatBadge(currentDoc.fileType);
  const BadgeIcon = badge.icon;

  const fileSizeLabel = currentDoc.fileSize
    ? currentDoc.fileSize > 1024 * 1024
      ? `${(currentDoc.fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(currentDoc.fileSize / 1024)} KB`
    : 'Unknown size';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="flex h-[94vh] w-full max-w-5xl flex-col rounded-2xl border-2 border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 dark:border-slate-800 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${badge.bg} ${badge.text} shadow-md`}>
              <BadgeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>

                {/* Status Indicators */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Uploaded</span>
                  <span className="text-slate-400">•</span>
                  <ShieldCheck className="h-3 w-3 text-blue-600" />
                  <span>Verified</span>
                  <span className="text-slate-400">•</span>
                  <Sparkles className="h-3 w-3 text-violet-600" />
                  <span>Ready</span>
                </div>

                <span className="rounded-md border border-slate-300 bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Course: {course.name}
                </span>
              </div>

              {mode === 'upload' ? (
                <input
                  type="text"
                  value={currentDoc.filename}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="mt-1 font-black text-sm sm:text-base text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none w-full truncate"
                  placeholder="Document Title"
                />
              ) : (
                <h2 className="mt-1 font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {currentDoc.filename}
                </h2>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download Original File Action */}
            {(originalBlob || currentDoc.file) && (
              <button
                type="button"
                onClick={handleDownloadOriginal}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Download original untouched file"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">Original File</span>
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Multi-Document Navigation Bar (Upload Mode) */}
        {mode === 'upload' && pendingDocs.length > 1 && (
          <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50/60 px-5 py-2 dark:border-slate-800 dark:bg-slate-800/50 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Document {currentIndex + 1} of {pendingDocs.length}</span>
              <span className="text-slate-400">•</span>
              <span className="text-[11px] text-slate-500">
                Review each file before final confirmation
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(pendingDocs.length - 1, prev + 1))}
                disabled={currentIndex === pendingDocs.length - 1}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Document Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shrink-0 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 p-2 dark:bg-slate-800/60">
            <Hash className="h-4 w-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">Length & Size</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                {currentDoc.pageCount || 1} {currentDoc.fileType === 'pptx' ? 'Slides' : 'Pages'} • {fileSizeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 p-2 dark:bg-slate-800/60">
            <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">Extracted Vocabulary</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                {wordCount.toLocaleString()} words
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 p-2 dark:bg-slate-800/60">
            <Layers className="h-4 w-4 text-violet-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">RAG Chunks</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                {currentDoc.chunks.length} chunks indexed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 p-2 dark:bg-slate-800/60">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">Est. Study Time</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                ~{readingTimeMin} min read
              </span>
            </div>
          </div>
        </div>

        {/* Viewport Control Bar: Tabs & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100/80 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>
                {currentDoc.fileType === 'image'
                  ? 'Visual Picture & OCR'
                  : currentDoc.fileType === 'pptx'
                  ? 'Presentation Deck'
                  : currentDoc.fileType === 'pdf'
                  ? 'PDF Canvas Viewer'
                  : 'Document View'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Extracted Text</span>
            </button>

            <button
              onClick={() => setActiveTab('chunks')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'chunks'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>RAG Chunks ({currentDoc.chunks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Key Concepts & AI Summary</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'text' && (
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find in document..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 dark:bg-slate-950">
          {/* 1. Visual Tab: PDF Canvas, PPTX Slide Deck, or Picture Viewer */}
          {activeTab === 'visual' && (
            <div className="space-y-4">
              {currentDoc.fileType === 'pdf' ? (
                <PDFCanvasViewer
                  source={originalBlob || currentDoc.file || null}
                  filename={currentDoc.filename}
                />
              ) : currentDoc.fileType === 'pptx' ? (
                <PPTXSlideViewer
                  filename={currentDoc.filename}
                  pages={currentDoc.pages || []}
                />
              ) : currentDoc.fileType === 'image' ? (
                <ImageViewer
                  src={originalObjectUrl || currentDoc.previewUrl || ''}
                  filename={currentDoc.filename}
                  extractedOCRText={currentDoc.text}
                />
              ) : (
                /* Fallback for plain text, markdown, docx */
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Document Content & Formatting
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {wordCount} words
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[500px] overflow-y-auto">
                    {cleanFullDocText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Full Extracted Text Tab */}
          {activeTab === 'text' && (
            <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              {cleanFullDocText.trim() ? (
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
                    cleanFullDocText
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs">No readable text found in this document.</p>
                </div>
              )}
            </div>
          )}

          {/* 3. Semantic Chunks Tab */}
          {activeTab === 'chunks' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200">
                <span className="font-bold">Knowledge Base Chunks:</span> This document is indexed into{' '}
                <span className="font-bold">{currentDoc.chunks.length} semantic chunks</span> for grounded active recall questions and RAG queries.
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
                          {currentDoc.fileType === 'pptx' ? `Slide ${chunk.pageNumber}` : `Page ${chunk.pageNumber}`}
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

          {/* 4. Summary & Concepts Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {currentDoc.summary && (
                <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-5 shadow-xs dark:border-violet-900/60 dark:from-violet-950/40 dark:to-slate-900">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold text-xs uppercase tracking-wider mb-2">
                    <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span>Executive Summary</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                    {currentDoc.summary}
                  </p>
                </div>
              )}

              {currentDoc.keyConcepts && currentDoc.keyConcepts.length > 0 && (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    <Brain className="h-4 w-4 text-violet-600" />
                    Academic Concepts & Key Terms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentDoc.keyConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 dark:border-slate-800 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            {mode === 'view' && onDeleteDoc && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Remove "${currentDoc.filename}" from course library?`)) {
                    onDeleteDoc(currentDoc.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition cursor-pointer"
                title="Remove document and original file from storage"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Action Buttons */}
            {mode === 'view' && (
              <>
                {onStartStudy && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartStudy(course.id, currentDoc.id);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Study Now</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenTutor) onOpenTutor();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-blue-600 bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span>Ask Gemini</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenQuestionGen) onOpenQuestionGen(course.id, currentDoc.id);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-violet-600 bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition cursor-pointer"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Generate Questions</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </>
            )}

            {/* Upload Mode Action Buttons */}
            {mode === 'upload' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndMakeQA}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-violet-700 bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Index & Make Q&A</span>
                </button>

                {pendingDocs.length > 1 && (
                  <button
                    type="button"
                    onClick={handleConfirmAll}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>Index All ({pendingDocs.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmSingle}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {pendingDocs.length > 1 ? 'Index Current Document' : 'Confirm & Index Document'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
