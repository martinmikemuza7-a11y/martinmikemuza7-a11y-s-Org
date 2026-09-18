import React from 'react';
import { motion } from 'motion/react';
import { Course, DocumentItem, Question, RecallSchedule, StudySession, AIStatus, ColorThemeId } from '../types';
import { COLOR_THEMES, COLOR_THEME_LIST } from '../lib/themes';
import { BeginnerGuideBanner } from './BeginnerGuideBanner';
import {
  Play,
  BookOpen,
  Calendar,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Brain,
  AlertTriangle,
  FolderOpen,
  HelpCircle,
  Palette,
  Check,
  Laptop,
  Smartphone,
  ArrowRightLeft,
  Cloud,
  Zap,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface HomeViewProps {
  courses: Course[];
  documents: DocumentItem[];
  questions: Question[];
  schedules: RecallSchedule[];
  recentSessions: StudySession[];
  aiStatus: AIStatus;
  colorTheme?: ColorThemeId;
  onUpdateColorTheme?: (colorTheme: ColorThemeId) => void;
  onNavigate: (tab: any, params?: any) => void;
  onStartStudy: (courseId: string, durationMinutes?: number) => void;
  user?: FirebaseUser | null;
  deviceType?: 'PC' | 'Phone' | 'Tablet';
  onOpenCloudSync?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  courses,
  documents,
  questions,
  schedules,
  recentSessions,
  aiStatus,
  colorTheme = 'violet',
  onUpdateColorTheme,
  onNavigate,
  onStartStudy,
  user,
  deviceType = 'PC',
  onOpenCloudSync,
}) => {
  const activeCourse = courses[0];
  const dueSchedules = schedules.filter((s) => s.enabled);
  const totalQuestions = questions.length;
  const recentSession = recentSessions[0];
  const themeConfig = COLOR_THEMES[colorTheme] || COLOR_THEMES.violet;

  // Calculate weak topics from recent sessions
  const weakTopics = Array.from(
    new Set(recentSessions.flatMap((s) => s.weakTopics || []))
  ).slice(0, 3);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 2D Beginner Friendly Guide Banner */}
      <BeginnerGuideBanner
        onNavigate={onNavigate}
        onStartStudy={() => activeCourse && onStartStudy(activeCourse.id, 15)}
      />

      {/* Welcome & Continue Studying 2D Card Banner */}
      <div className="card-2d relative overflow-hidden bg-amber-300 p-6 sm:p-8 dark:bg-amber-400 text-slate-950">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-md border-2 border-slate-900 bg-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-2d-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Active Recall & Spaced Repetition</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-md border-2 border-slate-900 bg-purple-300 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-2d-sm">
              <Brain className="h-3.5 w-3.5 text-purple-800 animate-thinking" />
              <span>Gemini Thinking Engine Active</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-950">
            Ready to master your course materials?
          </h1>

          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed max-w-xl">
            Every question, active recall quiz, and tutor answer is strictly grounded in your syllabus notes with exact page citations and deep pedagogical reasoning.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {activeCourse ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onStartStudy(activeCourse.id, 15)}
                className="btn-2d flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current text-emerald-600" />
                <span>Start Practice Drill: {activeCourse.name.slice(0, 20)}</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('courses')}
                className="btn-2d flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Course</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('tutor')}
              className="btn-2d flex items-center gap-2 rounded-xl bg-sky-200 px-4 py-3 text-sm font-black text-slate-950 cursor-pointer"
            >
              <Brain className="h-4 w-4 text-purple-700" />
              <span>Ask Gemini AI Tutor</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Color Palette Quick Bar right beneath the banner */}
      {onUpdateColorTheme && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-2xs"
              style={{ backgroundColor: themeConfig.hex }}
            >
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Color Themes
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: `${themeConfig.hex}18`,
                    color: themeConfig.hex,
                  }}
                >
                  {themeConfig.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tap any color tone to transform your app's visual style
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {COLOR_THEME_LIST.map((th) => {
              const isSel = colorTheme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => onUpdateColorTheme(th.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    isSel
                      ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900 ring-2 ring-offset-1'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                  style={{
                    ringColor: isSel ? th.hex : undefined,
                  }}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs ring-1 ring-black/15 dark:ring-white/20"
                    style={{ backgroundColor: th.hex }}
                  />
                  <span className="hidden sm:inline text-[11px]">{th.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-Device Live Cloud Sync (PC ↔ Phone) Banner */}
      {onOpenCloudSync && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 p-5 shadow-sm dark:border-blue-900/60 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    PC & Phone Cross-Device Cloud Sync
                  </h3>
                  {user ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Synced
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Ready to Link
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {user
                    ? `Connected as ${user.email}. Study materials, syllabi, and notes uploaded on PC appear on Phone and vice-versa in real-time.`
                    : 'Upload study notes on your PC and access them on your phone. Connect with Google to enable instant cross-device synchronization.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onOpenCloudSync}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 cursor-pointer"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>{user ? 'Sync Status & Details' : 'Connect PC & Phone'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid with 2D Flat Colors & Motion */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <motion.div
          whileHover={{ y: -4 }}
          className="card-2d border-2 border-slate-900 bg-sky-200 p-4 shadow-2d-sm text-slate-950 dark:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-900 bg-white shadow-2xs">
              <BookOpen className="h-4 w-4 text-sky-700" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Courses</span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950">
            {courses.length}
          </div>
          <p className="mt-1 text-xs font-bold text-slate-700">
            {documents.length} materials indexed
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="card-2d border-2 border-slate-900 bg-emerald-200 p-4 shadow-2d-sm text-slate-950 dark:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-900 bg-white shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Question Bank</span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950">
            {totalQuestions}
          </div>
          <p className="mt-1 text-xs font-bold text-slate-700">
            Grounded in notes
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="card-2d border-2 border-slate-900 bg-purple-200 p-4 shadow-2d-sm text-slate-950 dark:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-900 bg-white shadow-2xs">
              <Calendar className="h-4 w-4 text-purple-700" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Recall Due</span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950">
            {dueSchedules.length}
          </div>
          <p className="mt-1 text-xs font-bold text-slate-700">
            Spaced repetition
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="card-2d border-2 border-slate-900 bg-amber-200 p-4 shadow-2d-sm text-slate-950 dark:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-900 bg-white shadow-2xs">
              <Flame className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Study Streak</span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950">
            {recentSessions.length > 0 ? `${recentSessions.length}` : 'Start today'}
          </div>
          <p className="mt-1 text-xs font-bold text-slate-700">
            {aiStatus === 'online' ? '🧠 Gemini Active' : '⚡ Offline AI Ready'}
          </p>
        </motion.div>
      </div>

      {/* Two Column Layout: Quick Study & Upcoming Revisions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Quick Study Launcher & Courses */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick Study Session Launcher in 2D card */}
          <div className="card-2d border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <span>⏱️ Quick Study Session</span>
                  <span className="rounded-md border border-slate-900 bg-emerald-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-900">
                    1-Click Drill
                  </span>
                </h2>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Pick a duration. Gemini Reasoning constructs a balanced quiz session with step-by-step thinking.
                </p>
              </div>
              <button
                onClick={() => onNavigate('study')}
                className="btn-2d flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-slate-200 cursor-pointer"
              >
                <span>Custom</span> <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { mins: 15, bg: 'bg-emerald-100 hover:bg-emerald-200', text: 'text-emerald-950', badge: 'Quick Sprint' },
                { mins: 30, bg: 'bg-sky-100 hover:bg-sky-200', text: 'text-sky-950', badge: 'Standard Drill' },
                { mins: 45, bg: 'bg-indigo-100 hover:bg-indigo-200', text: 'text-indigo-950', badge: 'Deep Focus' },
                { mins: 60, bg: 'bg-amber-100 hover:bg-amber-200', text: 'text-amber-950', badge: 'Mastery Exam' },
              ].map((opt) => (
                <motion.button
                  key={opt.mins}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (activeCourse) onStartStudy(activeCourse.id, opt.mins);
                    else onNavigate('study');
                  }}
                  className={`btn-2d flex flex-col items-center justify-center rounded-xl border-2 border-slate-900 ${opt.bg} p-3.5 text-slate-950 cursor-pointer shadow-2d-sm`}
                >
                  <Clock className="h-5 w-5 mb-1 text-slate-900" />
                  <span className="text-base font-black">
                    {opt.mins} Min
                  </span>
                  <span className="mt-0.5 rounded border border-slate-900 bg-white px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-800">
                    {opt.badge}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Recent Courses List in 2D Card */}
          <div className="card-2d border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 dark:border-slate-700">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <span>📚 Your Course Knowledge Bases</span>
                </h2>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Isolated knowledge silos — Gemini answers strictly based on uploaded course notes.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('courses')}
                className="btn-2d flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <Plus className="h-4 w-4 font-black" />
                <span>New Course</span>
              </motion.button>
            </div>

            <div className="mt-4 space-y-3">
              {courses.length > 0 ? (
                courses.map((course) => {
                  const courseDocs = documents.filter((d) => d.courseId === course.id);
                  const courseQuestions = questions.filter((q) => q.courseId === course.id);

                  return (
                    <motion.div
                      key={course.id}
                      whileHover={{ scale: 1.01 }}
                      className="card-2d flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-slate-900 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80 shadow-2d-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 text-white font-black shadow-2d-sm text-lg"
                          style={{ backgroundColor: course.color || '#2563eb' }}
                        >
                          {course.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-950 dark:text-white">
                            {course.name}
                          </h3>
                          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                            {course.description || 'No description provided'}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1 rounded border border-slate-900 bg-amber-100 px-1.5 py-0.5 text-[10px]">
                              <FolderOpen className="h-3 w-3 text-amber-700" />
                              {courseDocs.length} materials
                            </span>
                            <span className="flex items-center gap-1 rounded border border-slate-900 bg-sky-100 px-1.5 py-0.5 text-[10px]">
                              <HelpCircle className="h-3 w-3 text-sky-700" />
                              {courseQuestions.length} questions
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => onStartStudy(course.id, 15)}
                          className="btn-2d rounded-lg border-2 border-slate-900 bg-emerald-400 px-3.5 py-1.5 text-xs font-black text-slate-950 cursor-pointer shadow-2d-sm"
                        >
                          Study Now
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => onNavigate('courses', { courseId: course.id })}
                          className="btn-2d rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-slate-100 dark:bg-slate-700 dark:text-white cursor-pointer shadow-2d-sm"
                        >
                          Manage
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 font-semibold text-sm text-slate-900 dark:text-white">
                    No courses yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                    Create a course to upload study materials, generate AI flashcards, and run spaced repetition.
                  </p>
                  <button
                    onClick={() => onNavigate('courses')}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Course</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Upcoming Active Recall & Weak Topics */}
        <div className="space-y-6">
          {/* Upcoming Active Recall Schedule in 2D Card */}
          <div className="card-2d border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600 font-black" />
                <h3 className="font-black text-sm text-slate-950 dark:text-white">
                  Upcoming Revisions
                </h3>
              </div>
              <button
                onClick={() => onNavigate('recall')}
                className="text-xs font-black text-blue-600 hover:underline dark:text-blue-400"
              >
                Schedule <ArrowRight className="inline h-3 w-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {dueSchedules.length > 0 ? (
                dueSchedules.slice(0, 3).map((sched) => {
                  const course = courses.find((c) => c.id === sched.courseId);
                  return (
                    <div
                      key={sched.id}
                      className="card-2d rounded-xl border-2 border-slate-900 bg-purple-100 p-3.5 shadow-2d-sm text-slate-950"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-purple-900">
                          {sched.date} • {sched.time}
                        </span>
                        <span className="rounded border border-slate-900 bg-white px-1.5 py-0.5 text-[10px] font-black uppercase text-purple-900">
                          {sched.recurrence}
                        </span>
                      </div>
                      <h4 className="mt-1 font-black text-xs text-slate-950 line-clamp-1">
                        {sched.title}
                      </h4>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-700">
                        {course?.name || 'General Course'} • {sched.questionCount} Questions
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onStartStudy(sched.courseId, 15)}
                        className="btn-2d mt-2.5 w-full rounded-lg border-2 border-slate-900 bg-purple-400 py-1.5 text-center text-xs font-black text-slate-950 shadow-2d-sm cursor-pointer"
                      >
                        Start Scheduled Recall
                      </motion.button>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs font-bold text-slate-500">
                  <p>No active revision schedules set.</p>
                  <button
                    onClick={() => onNavigate('recall')}
                    className="btn-2d mt-2.5 rounded-lg border-2 border-slate-900 bg-purple-200 px-3 py-1.5 text-xs font-black text-purple-950 cursor-pointer"
                  >
                    + Schedule First Revision
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Weak Topics Alert in 2D Card */}
          {weakTopics.length > 0 && (
            <div className="card-2d border-2 border-slate-900 bg-amber-100 p-5 shadow-2d text-slate-950">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-700 font-black shrink-0" />
                <h3 className="font-black text-sm text-slate-950">Targeted Priority Review</h3>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-800">
                Gemini identified concepts that need reinforcement based on your answers:
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {weakTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-xs font-black text-slate-950 shadow-2d-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('tutor', { initialMessage: `Can you explain the following concepts that I'm struggling with: ${weakTopics.join(', ')}? Please provide clear beginner-friendly examples.` })}
                className="btn-2d mt-3.5 w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-900 bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 shadow-2d-sm cursor-pointer"
              >
                <Brain className="h-4 w-4" />
                <span>Explain These with Gemini AI</span>
              </motion.button>
            </div>
          )}

          {/* Last Study Session Result in 2D Card */}
          {recentSession && (
            <div className="card-2d border-2 border-slate-900 bg-white p-5 shadow-2d dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Last Study Session
              </h3>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-950 dark:text-white">
                  {recentSession.score}%
                </span>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {recentSession.correctCount}/{recentSession.questionsCount} Correct
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-400 border-r-2 border-slate-900 transition-all duration-500"
                  style={{ width: `${recentSession.score}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                Course: {courses.find((c) => c.id === recentSession.courseId)?.name || 'Study Course'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
