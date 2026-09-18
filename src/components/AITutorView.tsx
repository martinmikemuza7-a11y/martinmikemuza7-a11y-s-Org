import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, TutorMessage, AppSettings, AIStatus } from '../types';
import { AIEngine } from '../lib/ai-engine';
import { putItem, getByIndex, deleteItem } from '../lib/db';
import {
  Send,
  Sparkles,
  BookOpen,
  Globe,
  Trash2,
  Cpu,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lightbulb,
  Type,
  HelpCircle,
  Brain,
  Zap,
} from 'lucide-react';
import { FormattedText, TextClaritySize } from './FormattedText';
import { GeminiThinkingBadge } from './GeminiThinkingBadge';

interface AITutorViewProps {
  courses: Course[];
  initialCourseId?: string;
  settings: AppSettings;
  aiStatus: AIStatus;
}

export const AITutorView: React.FC<AITutorViewProps> = ({
  courses,
  initialCourseId,
  settings,
  aiStatus,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || courses[0]?.id || ''
  );
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [webResearchEnabled, setWebResearchEnabled] = useState(settings.researchMode);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Text clarity size setting (persisted locally)
  const [claritySize, setClaritySize] = useState<TextClaritySize>(() => {
    return (localStorage.getItem('scholarsync_clarity_size') as TextClaritySize) || 'large';
  });

  const handleSetClaritySize = (size: TextClaritySize) => {
    setClaritySize(size);
    localStorage.setItem('scholarsync_clarity_size', size);
  };

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  // Load chat history for course
  useEffect(() => {
    if (!activeCourse) return;
    const loadHistory = async () => {
      const history = await getByIndex<TutorMessage>('tutorMessages', 'courseId', activeCourse.id);
      setMessages(history.sort((a, b) => a.timestamp - b.timestamp));
    };
    loadHistory();
  }, [activeCourse?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt || inputMessage).trim();
    if (!textToSend || !activeCourse || isLoading) return;

    const userMsg: TutorMessage = {
      id: `msg-${Date.now()}-user`,
      courseId: activeCourse.id,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    await putItem('tutorMessages', userMsg);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await AIEngine.chat(
        activeCourse.id,
        activeCourse.name,
        textToSend,
        historyPayload,
        webResearchEnabled
      );

      const botMsg: TutorMessage = {
        id: `msg-${Date.now()}-bot`,
        courseId: activeCourse.id,
        role: 'assistant',
        text: response.text,
        reasoning: response.reasoning,
        thinkingSteps: response.thinkingSteps,
        citations: response.citations,
        webSources: response.webSources,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
      await putItem('tutorMessages', botMsg);
    } catch (err: any) {
      console.error('Tutor chat error:', err);
      const errorMsg: TutorMessage = {
        id: `msg-${Date.now()}-err`,
        courseId: activeCourse.id,
        role: 'assistant',
        text: `Sorry, I encountered an error searching your course materials: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all conversation history for this course?')) return;
    for (const m of messages) {
      await deleteItem('tutorMessages', m.id);
    }
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-3xl border-3 border-slate-900 bg-white shadow-2d dark:border-slate-700 dark:bg-slate-900 pb-16 md:pb-0 overflow-hidden">
      {/* Tutor Header with 2D Styling */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-900 bg-amber-100/70 p-4 dark:border-slate-700 dark:bg-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-400 text-slate-950 shadow-2d-sm dark:border-slate-700 animate-brain-wave">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-950 dark:text-white">
                Course AI Tutor
              </h2>
              <span className="flex items-center gap-1 rounded-md border border-slate-900 bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-2xs">
                <Brain className="h-3 w-3" />
                Gemini Reasoning Engine
              </span>
              <span className="hidden sm:flex items-center gap-1 rounded-md border border-slate-900 bg-sky-200 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow-2xs">
                <ShieldCheck className="h-3 w-3 text-sky-700" />
                {activeCourse?.name}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Grounded exclusively in your syllabus notes with deep pedagogical reasoning.
            </p>
          </div>
        </div>

        {/* Course Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Clear Words / Font Size Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-2d-sm">
            <div className="flex items-center gap-1 px-1.5 text-xs font-black text-slate-900 dark:text-slate-200">
              <Type className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden sm:inline">Text Size:</span>
            </div>
            <button
              type="button"
              onClick={() => handleSetClaritySize('standard')}
              className={`px-2 py-0.5 text-xs font-bold rounded-md transition ${
                claritySize === 'standard'
                  ? 'bg-amber-300 text-slate-950 border border-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => handleSetClaritySize('large')}
              className={`px-2 py-0.5 text-xs font-bold rounded-md transition ${
                claritySize === 'large'
                  ? 'bg-amber-300 text-slate-950 border border-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Large
            </button>
            <button
              type="button"
              onClick={() => handleSetClaritySize('extra_large')}
              className={`px-2 py-0.5 text-xs font-bold rounded-md transition ${
                claritySize === 'extra_large'
                  ? 'bg-amber-300 text-slate-950 border border-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              XL
            </button>
          </div>

          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-2d-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Web Research Grounding Toggle */}
          <button
            onClick={() => setWebResearchEnabled(!webResearchEnabled)}
            className={`btn-2d flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
              webResearchEnabled
                ? 'bg-emerald-300 text-slate-950'
                : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title="When active, supplementary verified web citations are included"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Web Research:</span>
            <span>{webResearchEnabled ? 'On' : 'Off'}</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="btn-2d flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-700 hover:bg-rose-200 hover:text-rose-950 transition dark:bg-slate-800 dark:text-slate-300"
              title="Clear chat history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/40">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-8 text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-slate-900 bg-amber-300 text-slate-950 shadow-2d"
            >
              <Brain className="h-8 w-8 animate-thinking" />
            </motion.div>
            
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-sky-200 px-3 py-0.5 text-xs font-black uppercase tracking-wide text-slate-950 shadow-2xs mb-2">
                <Sparkles className="h-3.5 w-3.5 text-sky-700" />
                Beginner Friendly Tutor Ready
              </div>
              <h3 className="text-xl font-black text-slate-950 dark:text-white tracking-tight">
                Ask anything about {activeCourse?.name}!
              </h3>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Gemini's Thinking Engine actively reasons through your course syllabus, checks citations, and clarifies concepts step-by-step.
              </p>
            </div>

            {/* Quick Prompt Chips with 2D buttons */}
            <div className="pt-2">
              <span className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Try a 1-tap beginner prompt:
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Explain the core mechanism from my notes simply',
                  'What are the key definitions in this course?',
                  'Quiz me with a 3-question drill',
                  'What are common exam traps for this topic?',
                ].map((prompt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSend(prompt)}
                    className="btn-2d rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-900 dark:bg-slate-800 dark:text-slate-100 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition text-left"
                  >
                    💬 &quot;{prompt}&quot;
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            const userTextSize =
              claritySize === 'extra_large'
                ? 'text-lg sm:text-xl font-medium'
                : claritySize === 'large'
                ? 'text-base sm:text-lg font-medium'
                : 'text-sm sm:text-base font-normal';

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-400 text-slate-950 shadow-2d-sm mt-1">
                    <Brain className="h-5 w-5" />
                  </div>
                )}

                <div
                  className={`max-w-[92%] sm:max-w-2xl rounded-2xl p-5 leading-relaxed transition-all ${
                    isUser
                      ? 'border-2 border-slate-900 bg-sky-200 text-slate-950 shadow-2d-sm'
                      : 'card-2d bg-white text-slate-950 dark:bg-slate-900 dark:text-slate-100'
                  }`}
                >
                  {/* Speaker Label */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b-2 border-slate-900/20 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                      {isUser ? (
                        <>
                          <HelpCircle className="h-3.5 w-3.5 text-sky-800" />
                          <span className="text-slate-950">Student Question</span>
                        </>
                      ) : (
                        <>
                          <Brain className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-slate-950 dark:text-white">StudyBuddy AI Tutor</span>
                          <span className="rounded-md border border-slate-900 bg-amber-300 px-1.5 py-0.2 text-[9px] font-black uppercase text-slate-950 shadow-2xs ml-1">
                            Gemini 3.8
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Gemini Thinking & Reasoning Breakdown */}
                  {!isUser && (m.reasoning || (m.thinkingSteps && m.thinkingSteps.length > 0)) && (
                    <GeminiThinkingBadge
                      reasoning={m.reasoning}
                      thinkingSteps={m.thinkingSteps}
                    />
                  )}

                  {/* Message Content with High Clarity */}
                  {isUser ? (
                    <div className={`whitespace-pre-wrap leading-relaxed font-semibold ${userTextSize}`}>
                      {m.text}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <FormattedText
                        content={m.text}
                        size={claritySize}
                        className="text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>
                  )}

                  {/* Course Grounded Citations */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t-2 border-slate-900/20 dark:border-slate-700/50 space-y-1.5 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900">
                      <span className="block text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-amber-700" />
                        Verified Syllabus Sources:
                      </span>
                      {m.citations.map((cit, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>{cit}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Web Sources Grounding */}
                  {m.webSources && m.webSources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800">
                      <span className="block text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-emerald-600" />
                        Supplementary Web Research Citations:
                      </span>
                      {m.webSources.map((ws, wIdx) => (
                        <div
                          key={wIdx}
                          className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{ws}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-400 text-slate-950 shadow-2d-sm animate-thinking mt-1">
              <Brain className="h-5 w-5" />
            </div>
            <GeminiThinkingBadge isThinking={true} />
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Area with 2D Button and Tactile Styling */}
      <div className="border-t-2 border-slate-900 p-4 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask a beginner-friendly question about ${activeCourse?.name || 'your course notes'}...`}
            className="flex-1 rounded-2xl border-2 border-slate-900 bg-slate-50 px-4 py-3 text-sm sm:text-base font-bold text-slate-950 placeholder:text-slate-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition shadow-2d-sm"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="btn-2d flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 disabled:opacity-50"
            title="Send Question"
          >
            <Send className="h-5 w-5 font-black" />
          </motion.button>
        </form>
      </div>
    </div>
  );
};
