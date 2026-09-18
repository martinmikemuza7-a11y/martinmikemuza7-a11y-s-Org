import React, { useState } from 'react';
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Active Recall & Spaced Repetition
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scientifically timed revision schedules to beat the Ebbinghaus forgetting curve.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Revision</span>
        </button>
      </div>

      {/* Spaced Intervals Concept Banner */}
      <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-5 dark:border-purple-950 dark:bg-purple-950/20">
        <h3 className="font-semibold text-xs text-purple-900 dark:text-purple-200 uppercase tracking-wider">
          Spaced Repetition Algorithm
        </h3>
        <p className="mt-1 text-xs text-purple-800 dark:text-purple-300">
          When &quot;Spaced&quot; recurrence is active, revision reminders trigger across strategic retention milestones:
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-purple-900 shadow-2xs dark:bg-slate-900 dark:text-purple-300">
            Day 1: Initial recall
          </span>
          <span className="text-purple-400 font-bold">→</span>
          <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-purple-900 shadow-2xs dark:bg-slate-900 dark:text-purple-300">
            Day 3: Intermediate retention
          </span>
          <span className="text-purple-400 font-bold">→</span>
          <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-purple-900 shadow-2xs dark:bg-slate-900 dark:text-purple-300">
            Day 7: Synaptic consolidation
          </span>
          <span className="text-purple-400 font-bold">→</span>
          <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-purple-900 shadow-2xs dark:bg-slate-900 dark:text-purple-300">
            Day 14 & 30: Long-term mastery
          </span>
        </div>
      </div>

      {/* Scheduled Revisions List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Your Revision Timetable
        </h2>

        <div className="mt-4 space-y-3">
          {schedules.length > 0 ? (
            schedules.map((sched) => {
              const course = courses.find((c) => c.id === sched.courseId);
              return (
                <div
                  key={sched.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-purple-300 dark:border-slate-800 dark:hover:border-purple-900"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300 font-bold">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                          {sched.title}
                        </h4>
                        <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {sched.recurrence}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {course?.name || 'General Course'} • {sched.questionCount} Questions ({sched.difficulty})
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-purple-700 dark:text-purple-300 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {sched.date} at {sched.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(sched)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        sched.enabled
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {sched.enabled ? 'Enabled' : 'Paused'}
                    </button>
                    <button
                      onClick={() => onStartRecall(sched.courseId, 15)}
                      className="flex items-center gap-1 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start Now</span>
                    </button>
                    <button
                      onClick={() => handleDelete(sched.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No active recall schedules created. Click &quot;Schedule Revision&quot; to build your spaced study routine.
            </div>
          )}
        </div>
      </div>

      {/* Weak Questions Retry Bank */}
      {weakQuestions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Weak Concepts Retry Pool ({weakQuestions.length})
              </h3>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Questions you missed or answered partially in recent sessions. Drill them until mastered.
          </p>

          <div className="mt-4 space-y-3">
            {weakQuestions.slice(0, 6).map((q) => {
              const isRevealed = revealedQuestionIds.has(q.id);
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/20 space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-amber-200/40 dark:border-amber-900/40">
                    <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-800 dark:text-amber-300">
                      {q.type.replace('_', ' ')} • {q.difficulty}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{q.sourceCitation}</span>
                  </div>

                  <h4 className="font-bold text-slate-950 dark:text-white text-sm sm:text-base leading-snug">
                    {q.question}
                  </h4>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleRevealQuestion(q.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100/50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 transition"
                    >
                      {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      <span>{isRevealed ? 'Hide Answer' : 'Reveal Target Answer'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartRecall(q.courseId, 10)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Drill Course</span>
                    </button>
                  </div>

                  {isRevealed && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/60 animate-in fade-in duration-150">
                      <div className="rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 p-3 text-xs sm:text-sm border border-emerald-300 dark:border-emerald-800">
                        <span className="font-extrabold uppercase text-[11px] tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Target Answer:
                        </span>
                        <span className="font-bold text-slate-950 dark:text-white">
                          {q.correctAnswer}
                        </span>
                      </div>

                      {q.explanation && (
                        <div className="rounded-xl bg-white/90 dark:bg-slate-900/90 p-3 text-xs border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          <span className="font-bold block text-slate-900 dark:text-white mb-1">Explanation:</span>
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
            className="w-full max-w-md rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Schedule Active Recall Session
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Set automated reminders to reinforce key lecture topics.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Session Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Chapter 3 Review"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    First Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Recurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Questions Count
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Difficulty
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Mixed">Mixed (Recommended)</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
              >
                Confirm Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
