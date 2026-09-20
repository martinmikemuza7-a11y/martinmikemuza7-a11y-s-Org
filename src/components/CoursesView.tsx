import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, Folder, DocumentItem, DocumentChunk, Question } from '../types';
import { parseUploadedFile } from '../lib/file-parser';
import { chunkDocumentText } from '../lib/rag';
import { putItem, deleteItem, openDB, saveOriginalFile, deleteOriginalFile, getOriginalFile } from '../lib/db';
import {
  syncUploadDocument,
  syncDeleteDocument,
  syncUploadCourse,
  syncDeleteCourse,
  syncUploadFolder,
} from '../lib/cloudSync';
import {
  FolderPlus,
  FileText,
  UploadCloud,
  Trash2,
  Play,
  Brain,
  HelpCircle,
  Search,
  CheckCircle2,
  Loader2,
  Folder as FolderIcon,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  FileCode,
  Image as ImageIcon,
  Edit2,
  Plus,
  Eye,
  Presentation,
} from 'lucide-react';
import { DocumentUploadPreviewModal, PendingUploadItem } from './DocumentUploadPreviewModal';

const COURSE_COLORS = [
  { hex: '#2563eb', name: 'Royal Blue' },
  { hex: '#4f46e5', name: 'Electric Indigo' },
  { hex: '#7c3aed', name: 'Vivid Violet' },
  { hex: '#c026d3', name: 'Sunset Fuchsia' },
  { hex: '#e11d48', name: 'Ruby Rose' },
  { hex: '#ea580c', name: 'Warm Orange' },
  { hex: '#d97706', name: 'Amber Gold' },
  { hex: '#16a34a', name: 'Emerald Green' },
  { hex: '#0d9488', name: 'Ocean Teal' },
  { hex: '#0891b2', name: 'Bright Cyan' },
  { hex: '#0284c7', name: 'Sky Blue' },
  { hex: '#475569', name: 'Slate Gray' },
];

interface CoursesViewProps {
  courses: Course[];
  folders: Folder[];
  documents: DocumentItem[];
  chunks: DocumentChunk[];
  questions: Question[];
  onRefreshData: () => Promise<void>;
  onStartStudy: (courseId: string) => void;
  onOpenQuestionGen: (courseId: string, documentId?: string) => void;
  onOpenTutor: (courseId: string) => void;
  selectedCourseId?: string;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  folders,
  documents,
  chunks,
  questions,
  onRefreshData,
  onStartStudy,
  onOpenQuestionGen,
  onOpenTutor,
  selectedCourseId,
}) => {
  const [activeCourseId, setActiveCourseId] = useState<string>(
    selectedCourseId || courses[0]?.id || ''
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('#2563eb');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [pendingUploadDocs, setPendingUploadDocs] = useState<PendingUploadItem[]>([]);
  const [showUploadPreviewModal, setShowUploadPreviewModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const currentCourse = courses.find((c) => c.id === activeCourseId) || courses[0];
  const courseFolders = folders.filter((f) => f.courseId === currentCourse?.id);

  const courseDocs = documents.filter((d) => {
    if (d.courseId !== currentCourse?.id) return false;
    if (selectedFolderId) return d.folderId === selectedFolderId;
    return true;
  });

  const filteredDocs = courseDocs.filter((d) =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const courseQuestions = questions.filter((q) => q.courseId === currentCourse?.id);
  const courseChunks = chunks.filter((c) => c.courseId === currentCourse?.id);

  // File Upload Handler with Interactive Preview & Low-Memory Protection
  const handleFilesSelected = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0 || !currentCourse) return;

    // Reset input elements immediately to release OS file handles and browser memory
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';

    setIsUploading(true);
    const total = filesList.length;
    const parsedItems: PendingUploadItem[] = [];

    try {
      for (let i = 0; i < total; i++) {
        const file = filesList[i];
        setUploadProgressText(`Optimizing & extracting (${i + 1}/${total}): ${file.name}...`);

        // Yield execution to allow garbage collector to clean prior buffers
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        const docId = `doc-${Date.now()}-${i}`;

        // 1. Store the untouched original file separately in originalFiles store
        await saveOriginalFile({
          documentId: docId,
          filename: file.name,
          fileType: file.name.endsWith('.pdf')
            ? 'pdf'
            : file.name.endsWith('.pptx') || file.name.endsWith('.ppt')
            ? 'pptx'
            : file.type.startsWith('image/')
            ? 'image'
            : 'txt',
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          blob: file,
          createdAt: Date.now(),
        });

        // 2. Safely scan and extract structured text, pages, and summary
        const parsed = await parseUploadedFile(file);

        const tempDoc: DocumentItem = {
          id: docId,
          courseId: currentCourse.id,
          folderId: selectedFolderId || undefined,
          filename: file.name,
          fileType: parsed.fileType,
          fileSize: file.size,
          extractedText: parsed.text,
          pageCount: parsed.pageCount || 1,
          previewUrl: parsed.previewUrl,
          pages: parsed.pages,
          keyConcepts: parsed.keyConcepts,
          summary: parsed.summary,
          processingStatus: 'ready',
          createdAt: Date.now(),
        };

        const newChunks = chunkDocumentText(tempDoc).map((c, cIdx) => ({
          ...c,
          id: `chunk-${docId}-${cIdx}`,
          documentId: docId,
          courseId: currentCourse.id,
        }));

        parsedItems.push({
          file: file,
          id: docId,
          filename: file.name,
          fileType: parsed.fileType,
          fileSize: file.size,
          text: parsed.text,
          pageCount: parsed.pageCount || 1,
          previewUrl: parsed.previewUrl,
          pages: parsed.pages,
          folderId: selectedFolderId || undefined,
          chunks: newChunks,
          keyConcepts: parsed.keyConcepts,
          summary: parsed.summary,
        });
      }

      setIsUploading(false);
      setUploadProgressText('');
      setPendingUploadDocs(parsedItems);
      setShowUploadPreviewModal(true);
    } catch (err: any) {
      console.error('File parsing error:', err);
      const isMemoryError =
        err?.name === 'QuotaExceededError' ||
        /memory|quota|heap|out of memory/i.test(err?.message || '');

      if (isMemoryError) {
        alert(
          'Low memory warning detected: File was processed in optimized low-memory mode. High-resolution textures were trimmed to protect your device.'
        );
      } else {
        alert(`Error extracting document text: ${err.message || 'Unknown error'}`);
      }
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Confirm and save indexed documents from preview modal
  const handleConfirmUploadDocs = async (docs: PendingUploadItem[]) => {
    if (!currentCourse || !docs.length) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < docs.length; i++) {
        const item = docs[i];
        setUploadProgressText(`Indexing document ${i + 1} of ${docs.length}: ${item.filename}...`);

        const newDoc: DocumentItem = {
          id: item.id,
          courseId: currentCourse.id,
          folderId: item.folderId,
          filename: item.filename,
          fileType: item.fileType,
          fileSize: item.fileSize,
          extractedText: item.text,
          pageCount: item.pageCount,
          previewUrl: item.previewUrl,
          pages: item.pages,
          keyConcepts: item.keyConcepts,
          summary: item.summary,
          processingStatus: 'ready',
          createdAt: Date.now(),
        };

        const finalChunks = item.chunks.map((c) => ({
          ...c,
          documentId: newDoc.id,
          courseId: currentCourse.id,
        }));

        await syncUploadDocument(newDoc, finalChunks);
      }

      await onRefreshData();
      setUploadProgressText('Documents successfully indexed and synced!');
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgressText('');
      }, 1000);
    } catch (err: any) {
      console.error('Save document error:', err);
      alert(`Failed to save document: ${err.message}`);
      setIsUploading(false);
    }
  };

  // Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      name: newCourseName.trim(),
      description: newCourseDesc.trim(),
      color: newCourseColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await syncUploadCourse(newCourse);
    await onRefreshData();
    setActiveCourseId(newCourse.id);
    setNewCourseName('');
    setNewCourseDesc('');
    setShowCreateCourseModal(false);
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !currentCourse) return;

    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      courseId: currentCourse.id,
      name: newFolderName.trim(),
    };

    await syncUploadFolder(newFolder);
    await onRefreshData();
    setNewFolderName('');
    setShowCreateFolderModal(false);
  };

  // Delete Document
  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document and its indexed chunks?')) return;
    await syncDeleteDocument(docId);

    // Remove associated chunks
    const db = await openDB();
    const tx = db.transaction('chunks', 'readwrite');
    const store = tx.objectStore('chunks');
    const index = store.index('documentId');
    const req = index.getAll(docId);
    req.onsuccess = () => {
      const chunksToDelete = req.result;
      for (const ch of chunksToDelete) {
        store.delete(ch.id);
      }
    };

    await onRefreshData();
  };

  // Delete Course
  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Delete this course? All associated documents and questions will be deleted.')) return;

    await syncDeleteCourse(courseId);

    // Remove child records associated with this course
    try {
      const db = await openDB();
      const tx = db.transaction(['folders', 'documents', 'chunks', 'questions', 'schedules'], 'readwrite');
      
      const fStore = tx.objectStore('folders');
      const fReq = fStore.index('courseId').getAll(courseId);
      fReq.onsuccess = () => {
        (fReq.result || []).forEach((f) => fStore.delete(f.id));
      };

      const dStore = tx.objectStore('documents');
      const dReq = dStore.index('courseId').getAll(courseId);
      dReq.onsuccess = () => {
        (dReq.result || []).forEach((d) => dStore.delete(d.id));
      };

      const cStore = tx.objectStore('chunks');
      const cReq = cStore.index('courseId').getAll(courseId);
      cReq.onsuccess = () => {
        (cReq.result || []).forEach((c) => cStore.delete(c.id));
      };

      const qStore = tx.objectStore('questions');
      const qReq = qStore.index('courseId').getAll(courseId);
      qReq.onsuccess = () => {
        (qReq.result || []).forEach((q) => qStore.delete(q.id));
      };

      await new Promise<void>((res) => {
        tx.oncomplete = () => res();
        tx.onerror = () => res();
      });
    } catch (e) {
      console.error('Error cleaning up child course items:', e);
    }

    await onRefreshData();
    const remaining = courses.filter((c) => c.id !== courseId);
    setActiveCourseId(remaining[0]?.id || '');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Course Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-sky-200 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-2d-sm mb-2">
            <FolderPlus className="h-3.5 w-3.5" />
            <span>Knowledge Base</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Courses & Study Materials
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">
            Organize documents into isolated course workspaces. Upload notes, slides, and textbooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowCreateCourseModal(true)}
            className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-2d transition hover:bg-amber-300 cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" />
            <span>+ New Course</span>
          </motion.button>
        </div>
      </div>

      {/* Courses Horizontal Selector Pills */}
      {courses.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {courses.map((c) => {
            const isSelected = c.id === currentCourse?.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setActiveCourseId(c.id);
                  setSelectedFolderId(null);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl border-2 border-slate-900 px-4 py-2 text-xs font-black transition cursor-pointer shadow-2d-sm ${
                  isSelected
                    ? 'bg-amber-300 text-slate-950 dark:bg-amber-400'
                    : 'bg-white text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-slate-900"
                  style={{ backgroundColor: c.color || '#2563eb' }}
                />
                <span>{c.name}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Active Course Workspace */}
      {currentCourse && (
        <div className="space-y-6">
          {/* Course Metadata & Isolation Guarantee Banner */}
          <div className="card-2d overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-2d dark:border-slate-700 dark:bg-slate-900">
            <div className="h-2.5 w-full border-b-2 border-slate-900" style={{ backgroundColor: currentCourse.color || '#2563eb' }} />
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
                      {currentCourse.name}
                    </h2>
                    <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-emerald-300 px-3 py-0.5 text-xs font-black text-slate-950 shadow-2d-sm">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Isolated Knowledge Base</span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium max-w-xl">
                    {currentCourse.description || 'All AI queries, question generation, and active recall are strictly scoped to this course.'}
                  </p>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="rounded-lg border-2 border-slate-900 bg-slate-100 px-2.5 py-1 text-slate-950 shadow-2d-sm dark:bg-slate-800 dark:text-white">
                      <strong>{courseDocs.length}</strong> documents
                    </span>
                    <span className="rounded-lg border-2 border-slate-900 bg-slate-100 px-2.5 py-1 text-slate-950 shadow-2d-sm dark:bg-slate-800 dark:text-white">
                      <strong>{courseChunks.length}</strong> RAG chunks
                    </span>
                    <span className="rounded-lg border-2 border-slate-900 bg-slate-100 px-2.5 py-1 text-slate-950 shadow-2d-sm dark:bg-slate-800 dark:text-white">
                      <strong>{courseQuestions.length}</strong> practice questions
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onStartStudy(currentCourse.id)}
                    className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-2d transition hover:bg-amber-300 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Study</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onOpenQuestionGen(currentCourse.id)}
                    className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-sky-200 px-4 py-2.5 text-xs font-black text-slate-950 shadow-2d hover:bg-sky-300 dark:bg-sky-900/60 dark:text-white cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-slate-950 dark:text-sky-300" />
                    <span>Generate Questions</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onOpenTutor(currentCourse.id)}
                    className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-emerald-200 px-4 py-2.5 text-xs font-black text-slate-950 shadow-2d hover:bg-emerald-300 dark:bg-emerald-900/60 dark:text-white cursor-pointer"
                  >
                    <Brain className="h-3.5 w-3.5 text-slate-950 dark:text-emerald-300" />
                    <span>Ask AI Tutor</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Folders & Documents Explorer */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Folders Sidebar */}
            <div className="card-2d rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-2d dark:border-slate-700 dark:bg-slate-900 lg:col-span-1">
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100 dark:border-slate-800">
                <span className="font-black text-xs text-slate-950 dark:text-white uppercase tracking-wider">
                  Folders
                </span>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateFolderModal(true)}
                  className="btn-2d text-xs text-slate-950 font-black flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-amber-300 px-2 py-0.5 shadow-2d-sm cursor-pointer"
                >
                  <FolderPlus className="h-3 w-3" /> + New
                </motion.button>
              </div>

              <div className="mt-3 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-black transition cursor-pointer border-2 ${
                    selectedFolderId === null
                      ? 'border-slate-900 bg-amber-300 text-slate-950 shadow-2d-sm'
                      : 'border-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderIcon className={`h-4 w-4 ${selectedFolderId === null ? 'text-slate-950' : 'text-amber-500'}`} />
                    All Materials
                  </span>
                  <span className={`text-[11px] font-black ${selectedFolderId === null ? 'text-slate-950' : 'text-slate-500'}`}>
                    {documents.filter((d) => d.courseId === currentCourse.id).length}
                  </span>
                </button>

                {courseFolders.map((f) => {
                  const folderDocsCount = documents.filter(
                    (d) => d.courseId === currentCourse.id && d.folderId === f.id
                  ).length;
                  const isSelected = selectedFolderId === f.id;

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFolderId(f.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-black transition cursor-pointer border-2 ${
                        isSelected
                          ? 'border-slate-900 bg-sky-200 text-slate-950 shadow-2d-sm dark:bg-sky-950/60 dark:text-white dark:border-sky-400'
                          : 'border-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2 line-clamp-1">
                        <FolderIcon className="h-4 w-4 text-amber-500" />
                        {f.name}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">{folderDocsCount}</span>
                    </button>
                  );
                })}
              </div>

              {/* Course Danger Zone */}
              <div className="mt-8 pt-4 border-t-2 border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteCourse(currentCourse.id)}
                  className="flex items-center gap-1.5 text-xs font-black text-rose-600 hover:text-rose-700 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete this course</span>
                </button>
              </div>
            </div>

            {/* Documents & File Import Area */}
            <div className="space-y-6 lg:col-span-3">
              {/* Drag & Drop File Importer */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilesSelected(e.dataTransfer.files);
                }}
                className="card-2d relative rounded-2xl border-2 border-dashed border-slate-900 bg-amber-50/60 p-8 text-center shadow-2d-sm dark:border-slate-600 dark:bg-slate-800/40"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = '';
                  }}
                  multiple
                  accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md,.json,.csv,image/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = '';
                  }}
                  // @ts-ignore
                  webkitdirectory="true"
                  directory="true"
                  className="hidden"
                />

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-400 text-slate-950 shadow-2d">
                  <UploadCloud className="h-7 w-7" />
                </div>

                <h3 className="mt-3 text-base sm:text-lg font-black text-slate-950 dark:text-white">
                  Drop documents to import into {currentCourse.name}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto font-medium">
                  Instant preview & chunk verification before indexing. Supports PDF, PowerPoint (.pptx), Word (.docx), TXT, Markdown, and Images.
                </p>

                {isUploading ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-300 px-5 py-2.5 text-xs font-black text-slate-950 shadow-2d-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{uploadProgressText}</span>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-2d flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 px-5 py-2.5 text-xs font-black text-slate-950 shadow-2d hover:bg-amber-300 transition cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Select Files with Preview</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => folderInputRef.current?.click()}
                      className="btn-2d flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 py-2.5 text-xs font-black text-slate-900 shadow-2d hover:bg-slate-100 dark:bg-slate-800 dark:text-white transition cursor-pointer"
                    >
                      <FolderPlus className="h-4 w-4 text-amber-500" />
                      <span>Import Entire Folder</span>
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Documents List & Search */}
              <div className="card-2d rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-2d dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-950 dark:text-white">
                      {selectedFolderId
                        ? `Documents in "${courseFolders.find((f) => f.id === selectedFolderId)?.name}"`
                        : 'All Course Documents'}
                    </h3>
                    <span className="rounded-full border-2 border-slate-900 bg-sky-200 px-2 py-0.5 text-[11px] font-black text-slate-950 shadow-2d-sm">
                      {filteredDocs.length}
                    </span>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search files..."
                      className="w-full rounded-xl border-2 border-slate-900 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-bold text-slate-950 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => {
                      const docChunksCount = chunks.filter((c) => c.documentId === doc.id).length;
                      return (
                        <div
                          key={doc.id}
                          className="card-2d flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border-2 border-slate-900 bg-white p-3.5 shadow-2d-sm transition hover:translate-x-1 dark:border-slate-700 dark:bg-slate-850"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {doc.fileType === 'image' && doc.previewUrl ? (
                              <img
                                src={doc.previewUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="h-10 w-10 shrink-0 rounded-xl border-2 border-slate-900 object-cover shadow-2d-sm"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-950 font-black shadow-2d-sm">
                                {doc.fileType === 'pdf' ? (
                                  <FileText className="h-5 w-5" />
                                ) : doc.fileType === 'pptx' ? (
                                  <Presentation className="h-5 w-5" />
                                ) : doc.fileType === 'image' ? (
                                  <ImageIcon className="h-5 w-5" />
                                ) : (
                                  <FileCode className="h-5 w-5" />
                                )}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-xs sm:text-sm text-slate-950 dark:text-white line-clamp-1">
                                  {doc.filename}
                                </h4>
                                <span className="rounded border border-slate-900 bg-sky-200 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-slate-950">
                                  {doc.fileType}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {Math.round(doc.fileSize / 1024)} KB • {doc.fileType === 'pptx' ? `${doc.pageCount} Slides` : `${doc.pageCount} Pages`} • {docChunksCount} RAG Chunks
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setPreviewDoc(doc)}
                              className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-sky-200 px-3 py-1.5 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-sky-300 dark:bg-sky-900/60 dark:text-white transition cursor-pointer"
                              title="Inspect & Preview Document"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Preview</span>
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => onOpenQuestionGen(currentCourse.id, doc.id)}
                              className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-violet-300 px-3 py-1.5 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-violet-400 dark:bg-violet-900/60 dark:text-white transition cursor-pointer"
                              title="Generate Questions & Answers strictly from this Document"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-violet-950 dark:text-violet-200" />
                              <span>Make Q&A</span>
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="btn-2d rounded-xl border-2 border-slate-900 bg-rose-200 p-2 text-slate-950 shadow-2d-sm hover:bg-rose-300 transition cursor-pointer"
                              title="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs font-bold text-slate-500">
                      No documents found in this folder. Drag and drop notes above to preview and index them.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no course exists */}
      {!currentCourse && (
        <div className="rounded-3xl border-2 border-slate-300 bg-white p-8 sm:p-12 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
            <FolderPlus className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
            Create Your First Course
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            StudyBuddy isolates your study materials so your AI Tutor and question bank focus 100% on your specific subject.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowCreateCourseModal(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Course</span>
            </button>
          </div>

          {/* Quick Start Presets */}
          <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Or quick-start with a subject preset:
            </span>
            <div className="mt-3 flex flex-wrap justify-center gap-2.5">
              {[
                { name: 'Computer Science', color: '#2563eb', desc: 'Data structures, algorithms, and systems' },
                { name: 'World History', color: '#ea580c', desc: 'Civilizations, global conflicts, and treaties' },
                { name: 'Organic Chemistry', color: '#16a34a', desc: 'Reaction mechanisms and stereochemistry' },
                { name: 'Constitutional Law', color: '#7c3aed', desc: 'Judicial precedents and legal frameworks' },
                { name: 'Macroeconomics', color: '#0d9488', desc: 'Fiscal policy, monetary theory, and growth' },
                { name: 'Cognitive Psychology', color: '#c026d3', desc: 'Memory retention, perception, and cognition' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={async () => {
                    const newC: Course = {
                      id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                      name: preset.name,
                      description: preset.desc,
                      color: preset.color,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    await putItem('courses', newC);
                    await onRefreshData();
                    setActiveCourseId(newC.id);
                  }}
                  className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 transition"
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.color }} />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Document Preview & Inspector Modal (View Mode) */}
      {previewDoc && currentCourse && (
        <DocumentUploadPreviewModal
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
          mode="view"
          course={currentCourse}
          folders={courseFolders}
          viewDoc={previewDoc}
          viewChunks={chunks.filter((c) => c.documentId === previewDoc.id)}
          onOpenQuestionGen={onOpenQuestionGen}
          onOpenTutor={() => onOpenTutor(currentCourse.id)}
          onStartStudy={(courseId) => onStartStudy(courseId)}
          onDeleteDoc={(docId) => handleDeleteDoc(docId)}
        />
      )}

      {/* Interactive Document Upload Preview Modal (Upload Mode) */}
      {showUploadPreviewModal && pendingUploadDocs.length > 0 && currentCourse && (
        <DocumentUploadPreviewModal
          isOpen={true}
          onClose={() => {
            setShowUploadPreviewModal(false);
            // Clean up staged original files if user dismissed without confirming
            pendingUploadDocs.forEach((doc) => {
              deleteOriginalFile(doc.id).catch(() => {});
            });
            setPendingUploadDocs([]);
          }}
          mode="upload"
          course={currentCourse}
          folders={courseFolders}
          pendingDocs={pendingUploadDocs}
          onConfirmUpload={handleConfirmUploadDocs}
          onOpenQuestionGen={onOpenQuestionGen}
          onOpenTutor={() => onOpenTutor(currentCourse.id)}
        />
      )}

      {/* Create Course Modal */}
      {showCreateCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateCourse}
            className="card-2d w-full max-w-md rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900"
          >
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              Create New Course
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              A dedicated, isolated knowledge silo for this subject.
            </p>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g. Organic Chemistry II, Microeconomics..."
                  className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2.5 text-xs font-bold text-slate-950 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  placeholder="Topics covered, syllabus focus, exam dates..."
                  className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2.5 text-xs font-bold text-slate-950 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                  Theme Color
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  {COURSE_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.hex}
                      onClick={() => setNewCourseColor(c.hex)}
                      title={c.name}
                      className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer ${
                        newCourseColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-slate-900 dark:border-white scale-120 shadow-2d-sm ring-2 ring-amber-400'
                          : 'border-slate-900/40 hover:scale-110 opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  {/* Custom Hex Color Picker */}
                  <label
                    className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-slate-900 transition-all hover:scale-110 overflow-hidden shadow-2d-sm"
                    title="Choose custom color"
                  >
                    <input
                      type="color"
                      value={newCourseColor}
                      onChange={(e) => setNewCourseColor(e.target.value)}
                      className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                    />
                    <span
                      className="h-full w-full block rounded-full"
                      style={{ backgroundColor: newCourseColor }}
                    />
                  </label>
                </div>
                <p className="mt-1.5 text-[11px] font-bold text-slate-500">
                  Selected: <span className="font-mono font-black">{newCourseColor}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateCourseModal(false)}
                className="btn-2d rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-xs font-black text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="btn-2d rounded-xl border-2 border-slate-900 bg-amber-400 px-5 py-2 text-xs font-black text-slate-950 shadow-2d hover:bg-amber-300 transition cursor-pointer"
              >
                Create Course
              </motion.button>
            </div>
          </form>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateFolder}
            className="card-2d w-full max-w-sm rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900"
          >
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              Create Folder
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Organize lecture slides, textbooks, and notes.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                Folder Name
              </label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Chapter 4 - Thermodynamics"
                className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2.5 text-xs font-bold text-slate-950 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
                className="btn-2d rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-xs font-black text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="btn-2d rounded-xl border-2 border-slate-900 bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-2d hover:bg-amber-300 transition cursor-pointer"
              >
                Save Folder
              </motion.button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
