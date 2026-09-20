import React, { useState, useEffect } from 'react';
import { Course, DocumentItem, DocumentChunk, Question, QuestionType, DifficultyLevel } from '../types';
import { AIEngine } from '../lib/ai-engine';
import { syncUploadQuestion } from '../lib/cloudSync';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  X,
  FileText,
  Presentation,
  ImageIcon,
  FileCode,
  Lock,
  ChevronDown,
  ChevronUp,
  Layers,
  BookOpen,
  Info,
} from 'lucide-react';

interface QuestionGenModalProps {
  course: Course;
  documents: DocumentItem[];
  chunks: DocumentChunk[];
  isOpen: boolean;
  onClose: () => void;
  onQuestionsSaved: () => Promise<void>;
  initialDocumentId?: string;
  onPreviewDocument?: (doc: DocumentItem) => void;
}

export const QuestionGenModal: React.FC<QuestionGenModalProps> = ({
  course,
  documents,
  chunks,
  isOpen,
  onClose,
  onQuestionsSaved,
  initialDocumentId,
  onPreviewDocument,
}) => {
  const [count, setCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Mixed');
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'multiple_choice',
    'true_false',
    'short_answer',
  ]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocumentId || 'all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSourcePassages, setShowSourcePassages] = useState(false);

  // Update selectedDocId if initialDocumentId changes when opening
  useEffect(() => {
    if (initialDocumentId) {
      setSelectedDocId(initialDocumentId);
    } else {
      setSelectedDocId('all');
    }
    setGeneratedQuestions([]);
    setErrorMsg('');
  }, [initialDocumentId, isOpen]);

  if (!isOpen) return null;

  const targetDoc = documents.find((d) => d.id === selectedDocId);

  const courseChunks = chunks.filter((c) => {
    if (c.courseId !== course.id) return false;
    if (selectedDocId !== 'all') return c.documentId === selectedDocId;
    return true;
  });

  const toggleType = (t: QuestionType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((item) => item !== t));
      }
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const handleGenerate = async () => {
    if (courseChunks.length === 0) {
      setErrorMsg(
        targetDoc
          ? `No indexed chunks found for "${targetDoc.filename}". Please ensure the document is indexed.`
          : 'No indexed study notes found for this course. Please upload documents first.'
      );
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const results = await AIEngine.generateQuestions(
        course.id,
        course.name,
        courseChunks,
        count,
        difficulty,
        selectedTypes,
        targetDoc?.filename
      );

      setGeneratedQuestions(results);
    } catch (err: any) {
      console.error('Question generation error:', err);
      setErrorMsg(err.message || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    for (const q of generatedQuestions) {
      await syncUploadQuestion(q);
    }
    await onQuestionsSaved();
    onClose();
  };

  const getDocIcon = (type?: string) => {
    switch (type) {
      case 'pptx':
        return <Presentation className="h-4 w-4 text-amber-600" />;
      case 'image':
        return <ImageIcon className="h-4 w-4 text-emerald-600" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-rose-600" />;
      default:
        return <FileCode className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl border-2 border-slate-300 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                Generate Questions & Answers from Notes
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Course: {course.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {generatedQuestions.length === 0 ? (
            <>
              {/* Target Material Source Card */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Target Material Scope
                    </span>
                    {targetDoc && (
                      <span className="flex items-center gap-1 rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Lock className="h-3 w-3" />
                        Strict Document Lock
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {courseChunks.length} chunks ready for exam authoring
                  </span>
                </div>

                <div className="mt-3">
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-violet-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="all">
                      All Documents in Course ({chunks.filter((c) => c.courseId === course.id).length} chunks across {documents.filter((d) => d.courseId === course.id).length} files)
                    </option>
                    {documents
                      .filter((d) => d.courseId === course.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.filename} ({d.fileType.toUpperCase()} • {d.pageCount} {d.fileType === 'pptx' ? 'slides' : 'pages'})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Specific Document Lock Description */}
                {targetDoc ? (
                  <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/80 p-3 text-xs text-violet-950 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
                    <div className="flex items-center gap-2 font-black">
                      {getDocIcon(targetDoc.fileType)}
                      <span>Strict File Grounding: {targetDoc.filename}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-violet-900/80 dark:text-violet-300 font-medium">
                      All questions, choices, correct answers, and explanations will be generated exclusively from this file ({courseChunks.length} RAG chunks, ~{targetDoc.pageCount} {targetDoc.fileType === 'pptx' ? 'slides' : 'pages'}).
                    </p>

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSourcePassages(!showSourcePassages)}
                        className="flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:text-violet-800 dark:text-violet-300 transition cursor-pointer"
                      >
                        {showSourcePassages ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        <span>{showSourcePassages ? 'Hide' : 'Inspect'} Source Passages ({courseChunks.length} chunks)</span>
                      </button>

                      {onPreviewDocument && (
                        <button
                          type="button"
                          onClick={() => onPreviewDocument(targetDoc)}
                          className="ml-auto text-[11px] font-bold underline text-violet-700 hover:text-violet-900 dark:text-violet-300 cursor-pointer"
                        >
                          View Full File Preview
                        </button>
                      )}
                    </div>

                    {showSourcePassages && (
                      <div className="mt-3 max-h-44 overflow-y-auto space-y-2 rounded-lg bg-white p-2.5 border border-violet-200 dark:border-violet-900 dark:bg-slate-900 font-mono text-[11px]">
                        {courseChunks.map((c, i) => (
                          <div key={i} className="border-b border-slate-100 pb-1.5 last:border-0 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            <span className="font-bold text-violet-600 dark:text-violet-400">
                              [{c.pageNumber ? (targetDoc.fileType === 'pptx' ? `Slide ${c.pageNumber}` : `Page ${c.pageNumber}`) : `Chunk ${i + 1}`}]:
                            </span>{' '}
                            {c.text.slice(0, 160)}...
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>Questions will draw across all study materials currently indexed in this course.</span>
                  </div>
                )}
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  Question Count
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  {[3, 5, 10, 15].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`flex-1 rounded-xl border-2 py-2 text-center text-xs font-bold transition cursor-pointer ${
                        count === n
                          ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {n} Questions
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  Target Difficulty
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  {(['Easy', 'Medium', 'Hard', 'Mixed'] as DifficultyLevel[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 rounded-xl border-2 py-2 text-center text-xs font-bold transition cursor-pointer ${
                        difficulty === d
                          ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  Included Question Formats
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleType('multiple_choice')}
                    className={`rounded-xl border-2 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      selectedTypes.includes('multiple_choice')
                        ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleType('true_false')}
                    className={`rounded-xl border-2 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      selectedTypes.includes('true_false')
                        ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                    }`}
                  >
                    True / False
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleType('short_answer')}
                    className={`rounded-xl border-2 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      selectedTypes.includes('short_answer')
                        ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Short Answer
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 font-semibold">
                  {errorMsg}
                </div>
              )}
            </>
          ) : (
            /* Review Generated Questions */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully generated {generatedQuestions.length} practice questions from{' '}
                  {targetDoc ? targetDoc.filename : 'course study materials'}
                </span>
                <button
                  onClick={() => setGeneratedQuestions([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline cursor-pointer"
                >
                  Configure new
                </button>
              </div>

              {generatedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border-2 border-slate-200 bg-white p-4.5 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-800/80 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-1">
                    <span className="font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950 px-2 py-0.5 rounded-md">
                      {q.type.replace('_', ' ')} • {q.difficulty}
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                      Source: {q.sourceCitation}
                    </span>
                  </div>

                  <h4 className="font-black text-slate-950 dark:text-white text-sm sm:text-base leading-snug">
                    {idx + 1}. {q.question}
                  </h4>

                  {q.type === 'multiple_choice' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl border text-xs font-medium ${
                            opt === q.correctAnswer
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold dark:bg-emerald-950/50 dark:text-emerald-200 shadow-xs'
                              : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold mr-1.5">{String.fromCharCode(65 + oIdx)}.</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 font-semibold text-xs border border-emerald-300 dark:border-emerald-800">
                    <strong className="font-extrabold uppercase text-[10px] block text-emerald-800 dark:text-emerald-300 mb-0.5">
                      Target Correct Answer:
                    </strong>
                    {q.correctAnswer}
                  </div>

                  <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <strong className="font-bold block text-slate-900 dark:text-white mb-0.5">Explanation:</strong>
                    {q.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>

          {generatedQuestions.length === 0 ? (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing from {targetDoc ? targetDoc.filename : 'Document'}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Questions from {targetDoc ? 'this File' : 'Course Notes'}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save {generatedQuestions.length} Questions to Course Bank</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
