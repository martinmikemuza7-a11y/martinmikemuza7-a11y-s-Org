import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, GraduationCap, Brain, X, ChevronRight, HelpCircle, CheckCircle2 } from 'lucide-react';

interface BeginnerGuideBannerProps {
  onNavigate: (tab: any) => void;
  onStartStudy?: () => void;
}

export const BeginnerGuideBanner: React.FC<BeginnerGuideBannerProps> = ({
  onNavigate,
  onStartStudy,
}) => {
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem('studybuddy_hide_beginner_banner') !== 'true';
  });

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('studybuddy_hide_beginner_banner', 'true');
  };

  const handleRestore = () => {
    setIsOpen(true);
    localStorage.removeItem('studybuddy_hide_beginner_banner');
  };

  if (!isOpen) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRestore}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-2d-sm hover:bg-amber-400 transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Show Beginner Guide</span>
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-2xl border-3 border-slate-900 bg-amber-300 p-5 shadow-2d dark:border-slate-700 dark:bg-amber-400 text-slate-950"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-md border-2 border-slate-900 bg-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-slate-900 shadow-2d-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Beginner Friendly Guide</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
              Welcome to StudyBuddy! 3 Simple Steps to Ace Any Exam:
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 max-w-2xl">
              No complicated setups. You don't need to study for hours—just follow this 3-step active recall loop:
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close beginner guide"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-slate-900 bg-white text-slate-900 shadow-2d-sm hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Step 2D Cards Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Step 1 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('courses')}
            className="cursor-pointer rounded-xl border-2 border-slate-900 bg-white p-3.5 shadow-2d-sm hover:shadow-2d transition"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-300 text-[10px] font-black border border-slate-900">
                1
              </span>
              <BookOpen className="h-4 w-4 text-sky-600" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-950">Pick a Course</h4>
            <p className="text-xs font-medium text-slate-600 mt-1">
              Select an existing sample subject or add your own lecture notes.
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 mt-2">
              Go to Courses <ChevronRight className="h-3 w-3" />
            </span>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (onStartStudy) onStartStudy();
              else onNavigate('study');
            }}
            className="cursor-pointer rounded-xl border-2 border-slate-900 bg-white p-3.5 shadow-2d-sm hover:shadow-2d transition"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300 text-[10px] font-black border border-slate-900">
                2
              </span>
              <GraduationCap className="h-4 w-4 text-emerald-600" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-950">5-Min Recall Drill</h4>
            <p className="text-xs font-medium text-slate-600 mt-1">
              Practice 5 quick questions. Testing yourself strengthens memory retention 300%.
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
              Start Practice Drill <ChevronRight className="h-3 w-3" />
            </span>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('tutor')}
            className="cursor-pointer rounded-xl border-2 border-slate-900 bg-white p-3.5 shadow-2d-sm hover:shadow-2d transition"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-300 text-[10px] font-black border border-slate-900">
                3
              </span>
              <Brain className="h-4 w-4 text-purple-600" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-950">Ask Gemini AI</h4>
            <p className="text-xs font-medium text-slate-600 mt-1">
              Confused by any question? Let Gemini's Thinking Engine break it down step-by-step.
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 mt-2">
              Chat with Tutor <ChevronRight className="h-3 w-3" />
            </span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
