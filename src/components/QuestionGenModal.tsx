import React, { useState } from 'react';
import { Course, DocumentItem, DocumentChunk, Question, QuestionType, DifficultyLevel } from '../types';
import { AIEngine } from '../lib/ai-engine';
import { putItem } from '../lib/db';
import { syncUploadQuestion } from '../lib/cloudSync';
import { Sparkles, Loader2, CheckCircle2, X } from 'lucide-react';

interface QuestionGenModalProps {
  course: Course;
  documents: DocumentItem[];
  chunks: DocumentChunk[];
  isOpen: boolean;
  onClose: () => void;
  onQuestionsSaved: () => Promise<void>;
}

export const QuestionGenModal: React.FC<QuestionGenModalProps> = ({
  course,
  documents,
  chunks,
  isOpen,
  onClose,
  onQuestionsSaved,
}) => {
  const [count, setCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Mixed');
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'multiple_choice',
    'true_false',
    'short_answer',
  ]);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

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
      setErrorMsg('No indexed study notes found for this selection. Please upload documents first.');
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
        selectedTypes
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Generate Questions from Notes
              </h3>
              <p className="text-[11px] text-slate-500">
                Course: {course.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {generatedQuestions.length === 0 ? (
            <>
              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Material Source
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">All Documents in Course ({courseChunks.length} chunks)</option>
                  {documents
                    .filter((d) => d.courseId === course.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename}
                      </option>
                    ))}
                </select>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Question Count
                </label>
                <div className="mt-1 flex items-center gap-2">
                  {[3, 5, 10, 15].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`flex-1 rounded-xl border py-2 text-center text-xs font-medium transition ${
                        count === n
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold dark:bg-blue-950 dark:text-blue-300'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Difficulty
                </label>
                <div className="mt-1 flex items-center gap-2">
                  {(['Easy', 'Medium', 'Hard', 'Mixed'] as DifficultyLevel[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 rounded-xl border py-2 text-center text-xs font-medium transition ${
                        difficulty === d
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold dark:bg-blue-950 dark:text-blue-300'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Included Formats
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleType('multiple_choice')}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      selectedTypes.includes('multiple_choice')
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-800'
                    }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleType('true_false')}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      selectedTypes.includes('true_false')
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-800'
                    }`}
                  >
                    True / False
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleType('short_answer')}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      selectedTypes.includes('short_answer')
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-800'
                    }`}
                  >
                    Short Answer
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {errorMsg}
                </div>
              )}
            </>
          ) : (
            /* Review Generated Questions */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully generated {generatedQuestions.length} practice items
                </span>
                <button
                  onClick={() => setGeneratedQuestions([])}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Configure new
                </button>
              </div>

              {generatedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border-2 border-slate-200 bg-white p-4.5 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-800/80 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                      {q.type.replace('_', ' ')} • {q.difficulty}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{q.sourceCitation}</span>
                  </div>
                  <h4 className="font-bold text-slate-950 dark:text-white text-sm sm:text-base leading-snug">
                    {idx + 1}. {q.question}
                  </h4>
                  {q.type === 'multiple_choice' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-xl border text-xs font-medium ${
                            opt === q.correctAnswer
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold dark:bg-emerald-950/50 dark:text-emerald-200'
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
                    <strong className="font-extrabold uppercase text-[11px] block text-emerald-800 dark:text-emerald-300 mb-0.5">
                      Target Answer:
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
        <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
          >
            Cancel
          </button>

          {generatedQuestions.length === 0 ? (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
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
