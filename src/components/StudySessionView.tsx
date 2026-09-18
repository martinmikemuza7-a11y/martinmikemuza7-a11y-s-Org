import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FormattedText, TextClaritySize } from './FormattedText';

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Timed Study Mode
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dedicated distraction-free practice. Questions test comprehension with instant ground-truth citations.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-6">
            {/* Choose Course */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                1. Select Course
              </label>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {courses.map((c) => {
                  const qCount = questions.filter((q) => q.courseId === c.id).length;
                  const isSelected = c.id === selectedCourseId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <div
                        className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                        style={{ backgroundColor: c.color || '#2563eb' }}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                          {c.name}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {qCount} Questions in bank
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Choose Duration */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                2. Target Session Duration
              </label>
              <div className="mt-2 grid grid-cols-4 gap-3">
                {[15, 30, 45, 60].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setDurationMinutes(dur)}
                    className={`rounded-xl border py-3 text-center transition ${
                      durationMinutes === dur
                        ? 'border-blue-600 bg-blue-600 text-white font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <span className="text-sm font-semibold">{dur}</span>
                    <span className="block text-[10px] opacity-80">mins</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Session size: ~{Math.max(3, Math.round(durationMinutes / 3))} questions
              </span>
              <button
                onClick={handleStartSession}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Begin Timed Session</span>
              </button>
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
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Question {currentIndex + 1} of {sessionQuestions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleFinishSession}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              {currentQ.type.replace('_', ' ')} • {currentQ.difficulty}
            </span>
            <span className="text-xs text-slate-400">
              {activeCourse.name}
            </span>
          </div>

          <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white sm:text-lg leading-relaxed">
            {currentQ.question}
          </h2>

          {/* Answer Controls */}
          <div className="mt-6 space-y-3">
            {/* Multiple Choice Options */}
            {currentQ.type === 'multiple_choice' && currentQ.options && (
              <div className="space-y-2.5">
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  return (
                    <button
                      key={i}
                      disabled={isAnswered}
                      onClick={() => setSelectedOption(opt)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-xs sm:text-sm transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-medium dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* True/False */}
            {currentQ.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                {['True', 'False'].map((tf) => (
                  <button
                    key={tf}
                    disabled={isAnswered}
                    onClick={() => setSelectedOption(tf)}
                    className={`rounded-xl border py-4 text-center text-sm font-semibold transition ${
                      selectedOption === tf
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {tf}
                  </button>
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
                  placeholder="Formulate your explanation here. The AI will evaluate your conceptual accuracy against the course text..."
                  className="w-full rounded-xl border border-slate-200 p-4 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Submit Action */}
          {!isAnswered ? (
            <div className="mt-6 flex justify-end">
              <button
                disabled={
                  isEvaluating ||
                  (currentQ.type === 'short_answer' ? !shortAnswerText.trim() : !selectedOption)
                }
                onClick={handleSubmitAnswer}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isEvaluating ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    <span>Evaluating Answer...</span>
                  </>
                ) : (
                  <span>Submit Answer</span>
                )}
              </button>
            </div>
          ) : null}

          {/* Evaluation Results & Citation Drawer */}
          {currentEvaluation && (
            <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              {/* Badge & Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentEvaluation.evaluation === 'Correct' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : currentEvaluation.evaluation === 'Partial' ? (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span
                    className={`font-bold text-sm ${
                      currentEvaluation.evaluation === 'Correct'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : currentEvaluation.evaluation === 'Partial'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {currentEvaluation.evaluation} ({currentEvaluation.score}%)
                  </span>
                </div>

                <span className="text-[10px] text-slate-400">
                  Evaluator: {currentEvaluation.providerUsed}
                </span>
              </div>

              {/* Feedback Text */}
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {currentEvaluation.feedback}
              </p>

              {/* Ideal / Correct Answer */}
              <div className="rounded-lg bg-white p-3 text-xs dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Model Answer:
                </span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {currentEvaluation.idealAnswer}
                </p>
              </div>

              {/* Verified Source Citation */}
              <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Grounded in:</strong> {currentQ.sourceCitation}
                </span>
              </div>

              {/* Next Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <span>{currentIndex < sessionQuestions.length - 1 ? 'Next Question' : 'Finish Review'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Award className="h-8 w-8" />
          </div>

          <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
            Study Session Completed!
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {activeCourse.name} • {Math.round(finishedSummary.elapsedSeconds / 60)} minutes spent
          </p>

          {/* Score Metric Ring / Number */}
          <div className="mt-6 inline-block rounded-2xl bg-slate-50 px-8 py-6 dark:bg-slate-800/50">
            <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">
              {finishedSummary.score}%
            </span>
            <span className="block text-xs font-medium text-slate-500 mt-1">
              Overall Accuracy
            </span>
          </div>

          {/* Breakdown Pills */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {finishedSummary.correctCount}
              </span>
              <span className="block text-[11px] text-slate-500">Correct</span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                {finishedSummary.partialCount}
              </span>
              <span className="block text-[11px] text-slate-500">Partial</span>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
              <span className="text-lg font-bold text-red-700 dark:text-red-400">
                {finishedSummary.incorrectCount}
              </span>
              <span className="block text-[11px] text-slate-500">Review Needed</span>
            </div>
          </div>

          {/* Weak Topics to Retain */}
          {finishedSummary.weakTopics.length > 0 && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-800/40">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Priority Review Concepts
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {finishedSummary.weakTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs dark:bg-slate-900 dark:text-slate-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question-by-Question Review with Clear Words */}
          {sessionQuestions.length > 0 && (
            <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowQuestionReview(!showQuestionReview)}
                className="flex w-full items-center justify-between font-bold text-sm text-slate-900 dark:text-white"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  <span>Review All Questions & Answers ({sessionQuestions.length})</span>
                </div>
                {showQuestionReview ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {showQuestionReview && (
                <div className="mt-4 space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {sessionQuestions.map((q, qIdx) => {
                    const evalResult = answersSubmitted.get(qIdx);
                    const studentAns = studentAnswers.get(qIdx) || 'No response recorded';
                    const isCorrect = evalResult?.evaluation === 'Correct';
                    const isPartial = evalResult?.evaluation === 'Partial';

                    return (
                      <div
                        key={q.id || qIdx}
                        className={`rounded-2xl p-4.5 border-2 transition-all ${
                          isCorrect
                            ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                            : isPartial
                            ? 'border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20'
                            : 'border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20'
                        }`}
                      >
                        {/* Question Title & Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/5 dark:border-white/5">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            Question {qIdx + 1} • {q.type.replace('_', ' ')}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : isPartial
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
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
                        <h4 className="mt-2.5 font-bold text-slate-950 dark:text-white text-base leading-snug">
                          {q.question}
                        </h4>

                        {/* Student's Answer */}
                        <div className="mt-3 text-xs sm:text-sm">
                          <span className="font-extrabold uppercase text-[11px] tracking-wider text-slate-500 block">
                            Your Answer:
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                            {studentAns}
                          </span>
                        </div>

                        {/* Correct / Model Answer in clear words */}
                        <div className="mt-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 p-3 text-xs sm:text-sm border border-emerald-300 dark:border-emerald-800">
                          <span className="font-extrabold uppercase text-[11px] tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correct Answer:
                          </span>
                          <span className="font-bold text-slate-950 dark:text-white">
                            {evalResult?.idealAnswer || q.correctAnswer}
                          </span>
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="mt-2.5 text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                            <span className="font-bold block text-slate-900 dark:text-white mb-1">Explanation:</span>
                            <FormattedText content={q.explanation} size="standard" />
                          </div>
                        )}

                        {/* Source Citation */}
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <BookOpen className="h-3 w-3 text-blue-500 shrink-0" />
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
            <button
              onClick={() => onScheduleRecall(activeCourse.id, `Revision: ${activeCourse.name}`)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition"
            >
              <Calendar className="h-4 w-4" />
              <span>Add to Active Recall Schedule</span>
            </button>
            <button
              onClick={handleStartSession}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Session</span>
            </button>
            <button
              onClick={onDone}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-black dark:bg-white dark:text-slate-900"
            >
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
