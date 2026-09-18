import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, Question, StudySession, Attempt, DocumentChunk } from '../types';
import { AIEngine, EvaluationResult } from '../lib/ai-engine';
import { putItem } from '../lib/db';
import { syncUploadSession } from '../lib/cloudSync';
import { NotificationManager } from '../lib/notifications';
import {
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Award,
  Calendar,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Type,
  Brain,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FormattedText, TextClaritySize } from './FormattedText';
import { GeminiThinkingBadge } from './GeminiThinkingBadge';

interface StudySessionViewProps {
  courses: Course[];
  questions: Question[];
  chunks: DocumentChunk[];
  initialCourseId?: string;
  initialDuration?: number;
  onRefreshData: () => Promise<void>;
  onScheduleRecall: (courseId: string, title: string) => void;
  onDone: () => void;
}

export const StudySessionView: React.FC<StudySessionViewProps> = ({
  courses,
  questions,
  chunks,
  initialCourseId,
  initialDuration = 30,
  onRefreshData,
  onScheduleRecall,
  onDone,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || courses[0]?.id || ''
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
  const [sessionActive, setSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(initialDuration * 60);

  // Active quiz state
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [shortAnswerText, setShortAnswerText] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationResult | null>(null);
  const [answersSubmitted, setAnswersSubmitted] = useState<Map<number, EvaluationResult>>(new Map());
  const [studentAnswers, setStudentAnswers] = useState<Map<number, string>>(new Map());

  // Session summary
  const [sessionFinished, setSessionFinished] = useState(false);
  const [finishedSummary, setFinishedSummary] = useState<StudySession | null>(null);
  const [showQuestionReview, setShowQuestionReview] = useState(true);

  // Text clarity size setting (persisted locally)
  const [claritySize, setClaritySize] = useState<TextClaritySize>(() => {
    return (localStorage.getItem('scholarsync_clarity_size') as TextClaritySize) || 'large';
  });

  const handleSetClaritySize = (size: TextClaritySize) => {
    setClaritySize(size);
    localStorage.setItem('scholarsync_clarity_size', size);
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const courseQuestions = questions.filter((q) => q.courseId === activeCourse?.id);

  // Start Session
  const handleStartSession = () => {
    if (courseQuestions.length === 0) {
      alert('This course has no questions yet. Please generate questions first!');
      return;
    }

    // Shuffle and pick subset matching duration
    const targetCount = Math.max(3, Math.min(courseQuestions.length, Math.round(durationMinutes / 3)));
    const shuffled = [...courseQuestions].sort(() => 0.5 - Math.random()).slice(0, targetCount);

    setSessionQuestions(shuffled);
    setCurrentIndex(0);
    setSelectedOption('');
    setShortAnswerText('');
    setCurrentEvaluation(null);
    setAnswersSubmitted(new Map());
    setStudentAnswers(new Map());
    setSecondsRemaining(durationMinutes * 60);
    setSessionActive(true);
    setIsPaused(false);
    setSessionFinished(false);
  };

  // Timer Tick
  useEffect(() => {
    if (sessionActive && !isPaused && !sessionFinished) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleFinishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionActive, isPaused, sessionFinished]);

  // Submit current question answer
  const handleSubmitAnswer = async () => {
    const currentQ = sessionQuestions[currentIndex];
    if (!currentQ) return;

    const answer = currentQ.type === 'short_answer' ? shortAnswerText.trim() : selectedOption;
    if (!answer) return;

    setIsEvaluating(true);
    const relatedChunk = chunks.find((c) => c.documentId === currentQ.sourceDocumentId);
    const evalResult = await AIEngine.evaluateAnswer(currentQ, answer, relatedChunk);

    if (evalResult.evaluation === 'Correct') {
      NotificationManager.playSoundSuccess();
    } else {
      NotificationManager.playSoundChime();
    }

    setCurrentEvaluation(evalResult);
    setAnswersSubmitted((prev) => new Map(prev).set(currentIndex, evalResult));
    setStudentAnswers((prev) => new Map(prev).set(currentIndex, answer));

    // Save attempt record to IndexedDB
    const attempt: Attempt = {
      id: `att-${Date.now()}-${currentIndex}`,
      questionId: currentQ.id,
      courseId: currentQ.courseId,
      answer,
      evaluation: evalResult.evaluation,
      score: evalResult.score,
      feedback: evalResult.feedback,
      createdAt: Date.now(),
    };
    await putItem('attempts', attempt);

    setIsEvaluating(false);
  };

  // Next Question
  const handleNextQuestion = () => {
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption('');
      setShortAnswerText('');
      setCurrentEvaluation(null);
    } else {
      handleFinishSession();
    }
  };

  // End Session & Calculate Score
  const handleFinishSession = async () => {
    setSessionActive(false);
    setSessionFinished(true);

    const total = sessionQuestions.length;
    let correct = 0;
    let partial = 0;
    let incorrect = 0;
    const weakList: string[] = [];

    sessionQuestions.forEach((q, idx) => {
      const res = answersSubmitted.get(idx);
      if (res?.evaluation === 'Correct') {
        correct++;
      } else if (res?.evaluation === 'Partial') {
        partial++;
        if (q.keyConcepts) weakList.push(...q.keyConcepts);
      } else {
        incorrect++;
        if (q.keyConcepts) weakList.push(...q.keyConcepts);
      }
    });

    const calculatedScore = total > 0 ? Math.round(((correct + partial * 0.5) / total) * 100) : 0;
    const elapsedSeconds = durationMinutes * 60 - secondsRemaining;

    const completedSession: StudySession = {
      id: `session-${Date.now()}`,
      userId: 'local-user',
      courseId: activeCourse.id,
      title: `${activeCourse.name} Timed Review`,
      durationMinutes,
      elapsedSeconds,
      score: calculatedScore,
      questionsCount: total,
      correctCount: correct,
      partialCount: partial,
      incorrectCount: incorrect,
      weakTopics: Array.from(new Set(weakList)),
      createdAt: Date.now(),
      completedAt: Date.now(),
    };

    await syncUploadSession(completedSession);
    await onRefreshData();
    setFinishedSummary(completedSession);

    // Confetti celebration if high score
    if (calculatedScore >= 70) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQ = sessionQuestions[currentIndex];

  // 1. Session Setup View
  if (!sessionActive && !sessionFinished) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-20 md:pb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-amber-300 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-2d-sm mb-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Active Drill</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Timed Study Mode
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">
              Practice questions with instant citations and Gemini AI reasoning.
            </p>
          </div>
        </div>

        <div className="card-2d rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-6">
            {/* Choose Course */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Select Course Knowledge Base
              </label>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {courses.map((c) => {
                  const qCount = questions.filter((q) => q.courseId === c.id).length;
                  const isSelected = c.id === selectedCourseId;
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-sky-200 text-slate-950 shadow-2d-sm dark:bg-sky-950/60 dark:text-white dark:border-sky-400'
                          : 'border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className="h-10 w-10 shrink-0 rounded-xl border-2 border-slate-900 flex items-center justify-center font-black text-white text-sm shadow-2d-sm"
                        style={{ backgroundColor: c.color || '#2563eb' }}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-950 dark:text-white">
                          {c.name}
                        </h4>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {qCount} Questions in bank
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Choose Duration */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Target Session Duration
              </label>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {[15, 30, 45, 60].map((dur) => (
                  <motion.button
                    key={dur}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDurationMinutes(dur)}
                    className={`rounded-xl border-2 py-3 text-center transition cursor-pointer ${
                      durationMinutes === dur
                        ? 'border-slate-900 bg-amber-300 text-slate-950 font-black shadow-2d-sm dark:border-amber-400'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold'
                    }`}
                  >
                    <span className="text-sm sm:text-base font-black">{dur}</span>
                    <span className="block text-[10px] font-bold uppercase opacity-80">mins</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-5 border-t-2 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Session scope: <strong>~{Math.max(3, Math.round(durationMinutes / 3))}</strong> interactive questions
              </span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartSession}
                className="btn-2d flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-2d transition hover:bg-amber-300 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Begin Timed Session</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Session Screen
  if (sessionActive && currentQ) {
    const isAnswered = answersSubmitted.has(currentIndex);

    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-20 md:pb-8">
        {/* Top Floating Session Header: Timer & Progress */}
        <div className="card-2d flex items-center justify-between rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-2d-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs sm:text-sm font-black text-slate-950 shadow-2d-sm">
              <Clock className="h-4 w-4" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
            <span className="font-bold text-slate-400 dark:text-slate-600">/</span>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-200">
              Question {currentIndex + 1} of {sessionQuestions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPaused(!isPaused)}
              className="btn-2d rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-900 shadow-2d-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-white cursor-pointer"
            >
              {isPaused ? (
                <span className="flex items-center gap-1"><Play className="h-3.5 w-3.5 fill-current" /> Resume</span>
              ) : (
                <span className="flex items-center gap-1"><Pause className="h-3.5 w-3.5" /> Pause</span>
              )}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFinishSession}
              className="btn-2d rounded-xl border-2 border-slate-900 bg-rose-200 px-3 py-1.5 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-rose-300 cursor-pointer"
            >
              End Session
            </motion.button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100 shadow-2d-sm dark:border-slate-700 dark:bg-slate-800">
          <motion.div
            className="h-full bg-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question Card */}
        <div className="card-2d rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100 dark:border-slate-800">
            <span className="rounded-full border-2 border-slate-900 bg-sky-200 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-2d-sm">
              {currentQ.type.replace('_', ' ')} • {currentQ.difficulty}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {activeCourse.name}
            </span>
          </div>

          <h2 className="mt-4 text-base sm:text-xl font-black text-slate-950 dark:text-white leading-snug">
            {currentQ.question}
          </h2>

          {/* Answer Controls */}
          <div className="mt-6 space-y-3">
            {/* Multiple Choice Options */}
            {currentQ.type === 'multiple_choice' && currentQ.options && (
              <div className="space-y-3">
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      disabled={isAnswered}
                      whileHover={!isAnswered ? { x: 4, scale: 1.01 } : undefined}
                      whileTap={!isAnswered ? { scale: 0.99 } : undefined}
                      onClick={() => setSelectedOption(opt)}
                      className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left text-xs sm:text-sm transition cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-sky-200 text-slate-950 font-black shadow-2d-sm dark:bg-sky-950/60 dark:text-white dark:border-sky-400'
                          : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 text-xs font-black shadow-2d-sm ${
                        isSelected ? 'bg-amber-300 text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="mt-0.5 leading-relaxed">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* True/False */}
            {currentQ.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                {['True', 'False'].map((tf) => (
                  <motion.button
                    key={tf}
                    type="button"
                    disabled={isAnswered}
                    whileHover={!isAnswered ? { y: -2 } : undefined}
                    whileTap={!isAnswered ? { scale: 0.96 } : undefined}
                    onClick={() => setSelectedOption(tf)}
                    className={`rounded-xl border-2 py-4 text-center text-sm font-black transition cursor-pointer ${
                      selectedOption === tf
                        ? 'border-slate-900 bg-amber-300 text-slate-950 shadow-2d-sm dark:border-amber-400'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {tf}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Short Answer */}
            {currentQ.type === 'short_answer' && (
              <div>
                <textarea
                  rows={4}
                  disabled={isAnswered}
                  value={shortAnswerText}
                  onChange={(e) => setShortAnswerText(e.target.value)}
                  placeholder="Explain clearly in your own words. Gemini AI will evaluate your concepts against the course material..."
                  className="w-full rounded-xl border-2 border-slate-900 p-4 text-xs sm:text-sm text-slate-900 font-medium focus:border-amber-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-2d-sm"
                />
              </div>
            )}
          </div>

          {/* Submit Action */}
          {!isAnswered ? (
            <div className="mt-6 flex justify-end">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={
                  isEvaluating ||
                  (currentQ.type === 'short_answer' ? !shortAnswerText.trim() : !selectedOption)
                }
                onClick={handleSubmitAnswer}
                className="btn-2d flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-emerald-400 px-6 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-2d transition hover:bg-emerald-300 disabled:opacity-50 cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Gemini is Reasoning & Evaluating...</span>
                  </>
                ) : (
                  <span>Submit Answer</span>
                )}
              </motion.button>
            </div>
          ) : null}

          {/* Evaluation Results & Citation Drawer */}
          {currentEvaluation && (
            <div className="card-2d mt-6 space-y-4 rounded-xl border-2 border-slate-900 bg-amber-50/50 p-5 shadow-2d dark:border-slate-700 dark:bg-slate-800/60">
              {/* Badge & Score */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 px-3 py-1 text-xs font-black shadow-2d-sm ${
                      currentEvaluation.evaluation === 'Correct'
                        ? 'bg-emerald-300 text-slate-950'
                        : currentEvaluation.evaluation === 'Partial'
                        ? 'bg-amber-300 text-slate-950'
                        : 'bg-rose-300 text-slate-950'
                    }`}
                  >
                    {currentEvaluation.evaluation === 'Correct' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : currentEvaluation.evaluation === 'Partial' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span>{currentEvaluation.evaluation} ({currentEvaluation.score}%)</span>
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Evaluator: {currentEvaluation.providerUsed === 'online_gemini' ? 'Gemini 3.8 Flash' : 'Offline Local'}
                </span>
              </div>

              {/* Gemini Thinking & Reasoning Badge */}
              <GeminiThinkingBadge
                reasoning={currentEvaluation.reasoning}
                thinkingSteps={currentEvaluation.thinkingSteps}
              />

              {/* Feedback Text */}
              <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 text-xs sm:text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 shadow-2d-sm">
                <span className="font-black text-slate-950 dark:text-white uppercase tracking-wider text-[11px] block mb-1">
                  AI Feedback:
                </span>
                <p className="leading-relaxed">{currentEvaluation.feedback}</p>
              </div>

              {/* Ideal / Correct Answer */}
              <div className="rounded-xl border-2 border-slate-900 bg-emerald-100 p-3.5 text-xs sm:text-sm dark:bg-emerald-950/40 border-emerald-900/60 shadow-2d-sm">
                <span className="font-black uppercase text-[11px] tracking-wider text-emerald-950 dark:text-emerald-300 block mb-1">
                  Model Answer:
                </span>
                <p className="font-bold text-emerald-950 dark:text-emerald-100 leading-relaxed">
                  {currentEvaluation.idealAnswer}
                </p>
              </div>

              {/* Verified Source Citation */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                <BookOpen className="h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  <strong>Grounded in:</strong> {currentQ.sourceCitation}
                </span>
              </div>

              {/* Next Button */}
              <div className="mt-4 flex justify-end">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleNextQuestion}
                  className="btn-2d flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 px-6 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-2d hover:bg-amber-300 cursor-pointer"
                >
                  <span>{currentIndex < sessionQuestions.length - 1 ? 'Next Question' : 'Finish Review'}</span>
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Session Completed Summary Screen
  if (sessionFinished && finishedSummary) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-20 md:pb-8">
        <div className="card-2d rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d text-center dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          <motion.div
            initial={{ scale: 0.8, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-300 text-slate-950 shadow-2d"
          >
            <Award className="h-8 w-8" />
          </motion.div>

          <h2 className="mt-4 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
            Study Session Completed!
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
            {activeCourse.name} • {Math.round(finishedSummary.elapsedSeconds / 60)} minutes completed
          </p>

          {/* Score Metric Ring / Number */}
          <div className="mt-6 inline-block rounded-2xl border-2 border-slate-900 bg-amber-200 px-8 py-5 shadow-2d-sm">
            <span className="text-4xl sm:text-5xl font-black text-slate-950">
              {finishedSummary.score}%
            </span>
            <span className="block text-xs font-black uppercase tracking-wider text-slate-900 mt-1">
              Overall Accuracy
            </span>
          </div>

          {/* Breakdown Pills */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border-2 border-slate-900 bg-emerald-200 p-3 shadow-2d-sm text-slate-950">
              <span className="text-xl font-black">
                {finishedSummary.correctCount}
              </span>
              <span className="block text-[11px] font-black uppercase tracking-wider">Correct</span>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-amber-200 p-3 shadow-2d-sm text-slate-950">
              <span className="text-xl font-black">
                {finishedSummary.partialCount}
              </span>
              <span className="block text-[11px] font-black uppercase tracking-wider">Partial</span>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-rose-200 p-3 shadow-2d-sm text-slate-950">
              <span className="text-xl font-black">
                {finishedSummary.incorrectCount}
              </span>
              <span className="block text-[11px] font-black uppercase tracking-wider">Review Needed</span>
            </div>
          </div>

          {/* Weak Topics to Retain */}
          {finishedSummary.weakTopics.length > 0 && (
            <div className="card-2d mt-6 rounded-xl border-2 border-slate-900 bg-amber-50 p-4 text-left shadow-2d-sm dark:border-slate-700 dark:bg-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Priority Review Concepts
              </h4>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {finishedSummary.weakTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="rounded-lg border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black text-slate-950 shadow-2d-sm dark:bg-slate-900 dark:text-white"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question-by-Question Review with Clear Words */}
          {sessionQuestions.length > 0 && (
            <div className="card-2d mt-6 rounded-2xl border-2 border-slate-900 bg-white p-5 text-left shadow-2d-sm dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowQuestionReview(!showQuestionReview)}
                className="flex w-full items-center justify-between font-black text-sm text-slate-950 dark:text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-500" />
                  <span>Review All Questions & Answers ({sessionQuestions.length})</span>
                </div>
                {showQuestionReview ? (
                  <ChevronDown className="h-4 w-4 text-slate-900 dark:text-white" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-900 dark:text-white" />
                )}
              </button>

              {showQuestionReview && (
                <div className="mt-4 space-y-4 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
                  {sessionQuestions.map((q, qIdx) => {
                    const evalResult = answersSubmitted.get(qIdx);
                    const studentAns = studentAnswers.get(qIdx) || 'No response recorded';
                    const isCorrect = evalResult?.evaluation === 'Correct';
                    const isPartial = evalResult?.evaluation === 'Partial';

                    return (
                      <div
                        key={q.id || qIdx}
                        className={`rounded-xl p-4 border-2 border-slate-900 shadow-2d-sm transition-all ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/20'
                            : isPartial
                            ? 'bg-amber-50 dark:bg-amber-950/20'
                            : 'bg-rose-50 dark:bg-rose-950/20'
                        }`}
                      >
                        {/* Question Title & Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-slate-900/10 dark:border-white/10">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                            Question {qIdx + 1} • {q.type.replace('_', ' ')}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full border-2 border-slate-900 shadow-2d-sm ${
                              isCorrect
                                ? 'bg-emerald-300 text-slate-950'
                                : isPartial
                                ? 'bg-amber-300 text-slate-950'
                                : 'bg-rose-300 text-slate-950'
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                              </>
                            ) : isPartial ? (
                              <>
                                <AlertCircle className="h-3.5 w-3.5" /> Partial ({evalResult?.score}%)
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5" /> Incorrect
                              </>
                            )}
                          </span>
                        </div>

                        {/* Question Text */}
                        <h4 className="mt-2.5 font-black text-slate-950 dark:text-white text-base leading-snug">
                          {q.question}
                        </h4>

                        {/* Student's Answer */}
                        <div className="mt-3 text-xs sm:text-sm">
                          <span className="font-black uppercase text-[11px] tracking-wider text-slate-500 block">
                            Your Answer:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                            {studentAns}
                          </span>
                        </div>

                        {/* Correct / Model Answer */}
                        <div className="mt-2.5 rounded-xl bg-emerald-200 border-2 border-slate-900 p-3 text-xs sm:text-sm shadow-2d-sm">
                          <span className="font-black uppercase text-[11px] tracking-wider text-slate-950 flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Model Answer:
                          </span>
                          <span className="font-bold text-slate-950">
                            {evalResult?.idealAnswer || q.correctAnswer}
                          </span>
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="mt-2.5 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-900 shadow-2d-sm">
                            <span className="font-black block text-slate-950 dark:text-white mb-1 uppercase text-[11px] tracking-wider">Explanation:</span>
                            <FormattedText content={q.explanation} size="standard" />
                          </div>
                        )}

                        {/* Source Citation */}
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-900 dark:text-blue-300 font-bold">
                          <BookOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Grounded in: {q.sourceCitation}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Post-Session Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onScheduleRecall(activeCourse.id, `Revision: ${activeCourse.name}`)}
              className="btn-2d flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-sky-300 px-5 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-2d hover:bg-sky-200 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              <span>Add to Recall Schedule</span>
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStartSession}
              className="btn-2d flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-300 px-5 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-2d hover:bg-amber-200 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Session</span>
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDone}
              className="btn-2d flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-slate-950 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-2d hover:bg-slate-800 dark:bg-white dark:text-slate-950 cursor-pointer"
            >
              <span>Back to Home</span>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
