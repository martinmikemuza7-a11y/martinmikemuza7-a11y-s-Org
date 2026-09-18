import React from 'react';
import { Course, StudySession, Attempt, Question } from '../types';
import {
  BarChart3,
  Award,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Flame,
  Calendar,
} from 'lucide-react';

interface ProgressViewProps {
  courses: Course[];
  sessions: StudySession[];
  attempts: Attempt[];
  questions: Question[];
  onStartStudy: (courseId: string) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  courses,
  sessions,
  attempts,
  questions,
  onStartStudy,
}) => {
  const totalMinutes = Math.round(
    sessions.reduce((acc, s) => acc + (s.elapsedSeconds || s.durationMinutes * 60), 0) / 60
  );

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.evaluation === 'Correct').length;
  const overallAccuracy =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // Weak topics extracted across all sessions
  const weakTopics = Array.from(
    new Set(sessions.flatMap((s) => s.weakTopics || []))
  );

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Study Progress & Retention Analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track retention performance, completed timed sessions, and conceptual weak spots.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-5 shadow-sm dark:border-blue-950/50 dark:from-blue-950/20 dark:to-slate-900">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">Total Study Time</span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalMinutes} <span className="text-sm font-normal text-slate-500">mins</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Across {sessions.length} completed sessions
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-sm dark:border-emerald-950/50 dark:from-emerald-950/20 dark:to-slate-900">
          <div className="flex items-center gap-2 text-slate-500">
            <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Accuracy Rate</span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {overallAccuracy}%
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {correctAttempts} of {totalAttempts} questions correct
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white p-5 shadow-sm dark:border-purple-950/50 dark:from-purple-950/20 dark:to-slate-900">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">Questions Drilled</span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalAttempts}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {questions.length} total in knowledge banks
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white p-5 shadow-sm dark:border-amber-950/50 dark:from-amber-950/20 dark:to-slate-900">
          <div className="flex items-center gap-2 text-slate-500">
            <Flame className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">Mastery Streak</span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {sessions.length > 0 ? `${sessions.length} Days` : '0 Days'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Active study consistency</p>
        </div>
      </div>

      {/* Course Mastery Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Course-by-Course Retention
        </h2>

        <div className="mt-4 space-y-4">
          {courses.length > 0 ? (
            courses.map((course) => {
              const courseSessions = sessions.filter((s) => s.courseId === course.id);
              const courseQuestions = questions.filter((q) => q.courseId === course.id);
              const courseAttempts = attempts.filter((a) => a.courseId === course.id);
              const correctCount = courseAttempts.filter((a) => a.evaluation === 'Correct').length;
              const accuracy =
                courseAttempts.length > 0
                  ? Math.round((correctCount / courseAttempts.length) * 100)
                  : 0;

              return (
                <div
                  key={course.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: course.color || '#2563eb' }}
                      />
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {course.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">
                        {courseSessions.length} sessions • {courseAttempts.length} answers
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {accuracy}% Accuracy
                      </span>
                      <button
                        onClick={() => onStartStudy(course.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:opacity-90 transition"
                        style={{ backgroundColor: course.color || '#2563eb' }}
                      >
                        Study
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${accuracy}%`,
                        backgroundColor: course.color || '#2563eb',
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No courses configured yet. Add your courses in the Courses tab to start tracking retention metrics.
            </div>
          )}
        </div>
      </div>

      {/* Weak Areas & Conceptual Misconceptions */}
      {weakTopics.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-950 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-bold text-sm">Conceptual Misconceptions & Weak Concepts</h3>
          </div>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            These terms or mechanisms were flagged as incorrect or incomplete during recent sessions. The AI uses these to bias future practice tests toward mastery.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {weakTopics.map((topic, i) => (
              <span
                key={i}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-2xs dark:bg-slate-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Session History Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Recent Study Sessions History
        </h2>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.length > 0 ? (
            sessions.slice(0, 8).map((s) => {
              const course = courses.find((c) => c.id === s.courseId);
              return (
                <div key={s.id} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      {s.title}
                    </h4>
                    <p className="text-slate-500 text-[11px]">
                      {course?.name || 'General Course'} • {new Date(s.createdAt).toLocaleDateString()} at {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {s.score}%
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {s.correctCount}/{s.questionsCount} correct
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No sessions completed yet. Start a session in Study Mode to view historical analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
