import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, RecallSchedule, Question, Attempt, RecurrenceType } from '../types';
import { putItem, deleteItem } from '../lib/db';
import { syncUploadSchedule } from '../lib/cloudSync';
import { NotificationManager } from '../lib/notifications';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Play,
  Trash2,
  Bell,
  Sparkles,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  BookOpen,
} from 'lucide-react';
import { FormattedText } from './FormattedText';

interface RecallScheduleViewProps {
  courses: Course[];
  schedules: RecallSchedule[];
  questions: Question[];
  attempts: Attempt[];
  onRefreshData: () => Promise<void>;
  onStartRecall: (courseId: string, durationMinutes?: number) => void;
}

export const RecallScheduleView: React.FC<RecallScheduleViewProps> = ({
  courses,
  schedules,
  questions,
  attempts,
  onRefreshData,
  onStartRecall,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('18:00');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('spaced');
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState<any>('Mixed');

  // Find questions with low scores (weak concepts)
  const weakQuestionIds = new Set(
    attempts.filter((a) => a.evaluation === 'Incorrect' || a.score < 50).map((a) => a.questionId)
  );
  const weakQuestions = questions.filter((q) => weakQuestionIds.has(q.id));

  // Toggle reveal state for weak questions
  const [revealedQuestionIds, setRevealedQuestionIds] = useState<Set<string>>(new Set());
  const toggleRevealQuestion = (id: string) => {
    setRevealedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    const course = courses.find((c) => c.id === courseId);
    const newSchedule: RecallSchedule = {
      id: `sched-${Date.now()}`,
      courseId,
      title: title.trim() || `Recall: ${course?.name || 'Course'}`,
      date,
      time,
      recurrence,
      questionCount,
      questionType: 'mixed',
      difficulty: selectedDifficulty,
      enabled: true,
      createdAt: Date.now(),
    };

    await syncUploadSchedule(newSchedule);
    await onRefreshData();

    // Check notification permission
    await NotificationManager.requestPermission();
    setShowModal(false);
    setTitle('');
  };

  const handleDelete = async (id: string) => {
    await deleteItem('schedules', id);
    await onRefreshData();
  };

  const handleToggle = async (sched: RecallSchedule) => {
    const updated = { ...sched, enabled: !sched.enabled };
    await syncUploadSchedule(updated);
    await onRefreshData();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-purple-200 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-2d-sm mb-2">
            <Repeat className="h-3.5 w-3.5" />
            <span>Spaced Repetition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Active Recall & Spaced Repetition
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">
            Scientifically timed revision schedules to beat the Ebbinghaus forgetting curve.
          </p>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowModal(true)}
          className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-2d transition hover:bg-amber-300 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Revision</span>
        </motion.button>
      </div>

      {/* Spaced Intervals Concept Banner */}
      <div className="card-2d rounded-2xl border-2 border-slate-900 bg-amber-50/60 p-5 shadow-2d-sm dark:border-slate-700 dark:bg-slate-800/40">
        <h3 className="font-black text-xs text-slate-950 dark:text-white uppercase tracking-wider">
          Spaced Repetition Algorithm
        </h3>
        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
          When &quot;Spaced&quot; recurrence is active, revision reminders trigger across strategic retention milestones:
        </p>
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 font-black text-slate-950 shadow-2d-sm dark:bg-slate-900 dark:text-white dark:border-slate-700">
            Day 1: Initial recall
          </span>
          <span className="text-slate-900 dark:text-white font-black">→</span>
          <span className="rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 font-black text-slate-950 shadow-2d-sm dark:bg-slate-900 dark:text-white dark:border-slate-700">
            Day 3: Intermediate retention
          </span>
          <span className="text-slate-900 dark:text-white font-black">→</span>
          <span className="rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 font-black text-slate-950 shadow-2d-sm dark:bg-slate-900 dark:text-white dark:border-slate-700">
            Day 7: Synaptic consolidation
          </span>
          <span className="text-slate-900 dark:text-white font-black">→</span>
          <span className="rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1.5 font-black text-slate-950 shadow-2d-sm">
            Day 14 & 30: Long-term mastery
          </span>
        </div>
      </div>

      {/* Scheduled Revisions List */}
      <div className="card-2d rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm sm:text-base font-black text-slate-950 dark:text-white pb-3 border-b-2 border-slate-100 dark:border-slate-800">
          Your Revision Timetable
        </h2>

        <div className="mt-4 space-y-3">
          {schedules.length > 0 ? (
            schedules.map((sched) => {
              const course = courses.find((c) => c.id === sched.courseId);
              return (
                <div
                  key={sched.id}
                  className="card-2d flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-slate-900 bg-white p-4 shadow-2d-sm transition hover:translate-x-1 dark:border-slate-700 dark:bg-slate-850"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-purple-200 text-slate-950 font-black shadow-2d-sm">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-slate-950 dark:text-white">
                          {sched.title}
                        </h4>
                        <span className="rounded border border-slate-900 bg-purple-200 px-2 py-0.5 text-[10px] font-black text-slate-950">
                          {sched.recurrence}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                        {course?.name || 'General Course'} • {sched.questionCount} Questions ({sched.difficulty})
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-800 dark:text-slate-300 font-bold">
                        <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-900 dark:bg-slate-800 dark:text-white">
                          <Clock className="h-3.5 w-3.5" />
                          {sched.date} at {sched.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleToggle(sched)}
                      className={`btn-2d rounded-xl border-2 border-slate-900 px-3 py-1.5 text-xs font-black transition cursor-pointer shadow-2d-sm ${
                        sched.enabled
                          ? 'bg-emerald-300 text-slate-950'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {sched.enabled ? 'Enabled' : 'Paused'}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onStartRecall(sched.courseId, 15)}
                      className="btn-2d flex items-center gap-1 rounded-xl border-2 border-slate-900 bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-amber-300 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start Now</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(sched.id)}
                      className="btn-2d rounded-xl border-2 border-slate-900 bg-rose-200 p-2 text-slate-950 shadow-2d-sm hover:bg-rose-300 transition cursor-pointer"
                      title="Delete schedule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs font-bold text-slate-500">
              No active recall schedules created. Click &quot;Schedule Revision&quot; to build your spaced study routine.
            </div>
          )}
        </div>
      </div>

      {/* Weak Questions Retry Bank */}
      {weakQuestions.length > 0 && (
        <div className="card-2d rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-black text-sm text-slate-950 dark:text-white">
                Weak Concepts Retry Pool ({weakQuestions.length})
              </h3>
            </div>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            Questions you missed or answered partially in recent sessions. Drill them until mastered.
          </p>

          <div className="mt-4 space-y-3">
            {weakQuestions.slice(0, 6).map((q) => {
              const isRevealed = revealedQuestionIds.has(q.id);
              return (
                <div
                  key={q.id}
                  className="card-2d rounded-2xl border-2 border-slate-900 bg-amber-50/50 p-4 text-xs dark:border-slate-700 dark:bg-slate-850 space-y-2.5 transition-all shadow-2d-sm"
                >
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-900/10 dark:border-slate-700">
                    <span className="font-black uppercase tracking-wider text-[11px] text-amber-900 dark:text-amber-300">
                      {q.type.replace('_', ' ')} • {q.difficulty}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold">{q.sourceCitation}</span>
                  </div>

                  <h4 className="font-black text-slate-950 dark:text-white text-sm sm:text-base leading-snug">
                    {q.question}
                  </h4>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => toggleRevealQuestion(q.id)}
                      className="btn-2d inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-white transition cursor-pointer"
                    >
                      {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      <span>{isRevealed ? 'Hide Answer' : 'Reveal Target Answer'}</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onStartRecall(q.courseId, 10)}
                      className="btn-2d inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-amber-300 transition cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Drill Course</span>
                    </motion.button>
                  </div>

                  {isRevealed && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-slate-900/10 dark:border-slate-700 animate-in fade-in duration-150">
                      <div className="rounded-xl border-2 border-slate-900 bg-emerald-100 p-3 text-xs sm:text-sm shadow-2d-sm dark:bg-emerald-950/60 dark:border-emerald-700">
                        <span className="font-black uppercase text-[11px] tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Target Answer:
                        </span>
                        <span className="font-bold text-slate-950 dark:text-white">
                          {q.correctAnswer}
                        </span>
                      </div>

                      {q.explanation && (
                        <div className="rounded-xl border-2 border-slate-900 bg-white p-3 text-xs shadow-2d-sm dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                          <span className="font-black block text-slate-950 dark:text-white mb-1">Explanation:</span>
                          <FormattedText content={q.explanation} size="standard" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateSchedule}
            className="card-2d w-full max-w-md rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900"
          >
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              Schedule Active Recall Session
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Set automated reminders to reinforce key lecture topics.
            </p>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                  Target Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2 text-xs font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                  Session Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Chapter 3 Review"
                  className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2 text-xs font-bold text-slate-950 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                    First Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2 text-xs font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2 text-xs font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                  Recurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                  className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2 text-xs font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="spaced">Spaced Repetition (Optimal 1d, 3d, 7d, 14d, 30d)</option>
                  <option value="daily">Daily Review</option>
                  <option value="3days">Every 3 Days</option>
                  <option value="weekly">Weekly</option>
                  <option value="once">One-time Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                    Questions Count
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                    className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2 text-xs font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                    Difficulty
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="mt-1 w-full rounded-xl border-2 border-slate-900 bg-slate-50 p-2 text-xs font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Mixed">Mixed (Recommended)</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
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
                Confirm Schedule
              </motion.button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
