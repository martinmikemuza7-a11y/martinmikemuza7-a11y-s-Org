import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, ChevronDown, ChevronUp, Sparkles, CheckCircle2, Cpu, Zap, Eye, Lightbulb } from 'lucide-react';

interface GeminiThinkingBadgeProps {
  reasoning?: string;
  thinkingSteps?: string[];
  isThinking?: boolean;
  compact?: boolean;
  badgeLabel?: string;
}

export const GeminiThinkingBadge: React.FC<GeminiThinkingBadgeProps> = ({
  reasoning,
  thinkingSteps = [],
  isThinking = false,
  compact = false,
  badgeLabel = 'Gemini AI Thinking Engine',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If thinking is active, show pulsing animated state
  if (isThinking) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2.5 rounded-xl border-2 border-slate-900 bg-amber-200 px-3.5 py-2 shadow-2d-sm dark:border-slate-700 dark:bg-amber-400 dark:text-slate-900"
      >
        <div className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
          <Brain className="relative h-4 w-4 text-slate-950 animate-thinking" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-black tracking-wide uppercase text-slate-950">
            Gemini is Thinking & Reasoning...
          </span>
          <span className="text-[11px] font-semibold text-slate-800">
            Analyzing syllabus context & structuring clear answer
          </span>
        </div>
      </motion.div>
    );
  }

  // If no reasoning text or steps, just show the badge
  if (!reasoning && (!thinkingSteps || thinkingSteps.length === 0)) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-amber-100 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-2d-sm dark:border-slate-700 dark:bg-amber-300">
        <Brain className="h-3.5 w-3.5 text-amber-700 dark:text-amber-900" />
        <span>{badgeLabel}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-slate-900 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-2d-sm overflow-hidden my-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-amber-50/80 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-900 bg-amber-300 text-slate-900 shadow-2xs dark:border-slate-700">
            <Brain className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-amber-300">
                {badgeLabel}
              </span>
              <span className="rounded-md border border-slate-900 bg-emerald-300 px-1.5 py-0.2 text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-2xs">
                Deep Reasoned
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {isExpanded ? 'Click to collapse reasoning chain' : 'Click to inspect step-by-step cognitive breakdown'}
            </p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-900 bg-white text-slate-900 dark:bg-slate-800 dark:text-white dark:border-slate-700"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t-2 border-slate-900 dark:border-slate-700 p-3.5 space-y-3 bg-amber-50/30 dark:bg-slate-900"
          >
            {/* Thinking steps sequence */}
            {thinkingSteps && thinkingSteps.length > 0 && (
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                  <Cpu className="h-3.5 w-3.5 text-amber-600" />
                  Cognitive Reasoning Sequence:
                </span>
                <div className="space-y-1.5">
                  {thinkingSteps.map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-[10px] border border-slate-900 shadow-2xs mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="font-medium leading-tight">{step}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed reasoning thought narrative */}
            {reasoning && (
              <div className="rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800/80 p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="block font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Gemini Thought Process & Rationale:
                </span>
                <p className="font-normal">{reasoning}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
