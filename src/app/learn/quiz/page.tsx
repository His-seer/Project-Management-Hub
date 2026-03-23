'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  generateQuiz,
  QUIZ_TOPICS,
  QUIZ_CERTS,
  DEFAULT_PREFERENCES,
  type QuizQuestion,
  type QuizPreferences,
  type QuizTopic,
  type QuizCert,
  type QuizDifficulty,
  type QuizAttempt,
  QUESTIONS,
} from '@/lib/quizBank';
import { generateId } from '@/lib/ids';
import apiFetch from '@/lib/apiFetch';
import { readSseStream, parseAiJson } from '@/lib/aiUtils';
import {
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Target,
  BarChart3,
  Settings2,
  Play,
  Flame,
  TrendingUp,
  Loader2,
  Sparkles,
} from 'lucide-react';

type QuizState = 'setup' | 'active' | 'review' | 'history';

export default function QuizPage() {
  const [state, setState] = useState<QuizState>('setup');
  const [preferences, setPreferences] = useState<QuizPreferences>(DEFAULT_PREFERENCES);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');

  // Load history
  useEffect(() => {
    apiFetch('/api/quiz?userId=default')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHistory(data); })
      .catch(() => {});
  }, [state]);

  // Timer
  useEffect(() => {
    if (state !== 'active' || showExplanation) return;
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [state, timeLeft, showExplanation]);

  // Total time tracker
  useEffect(() => {
    if (state !== 'active') return;
    const timer = setInterval(() => setTotalTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  const startQuiz = async () => {
    setQuizLoading(true);
    setQuizError('');

    try {
      // Try AI generation first for the exact count requested
      const res = await apiFetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: preferences.topics,
          certifications: preferences.certifications,
          difficulty: preferences.difficulty,
          questionCount: preferences.questionCount,
        }),
      });
      const raw = await readSseStream(res);
      const generated = parseAiJson<QuizQuestion[]>(raw);

      if (generated.length > 0) {
        // Ensure IDs are set
        const withIds = generated.map((q, i) => ({ ...q, id: q.id || `gen_${i + 1}` }));
        setQuestions(withIds);
        setAnswers(new Array(withIds.length).fill(null));
        setCurrentIndex(0);
        setSelectedOption(null);
        setShowExplanation(false);
        setTimeLeft(preferences.timePerQuestion);
        setTotalTime(0);
        setState('active');
        return;
      }
    } catch {
      // AI generation failed — fall back to static bank
    }

    // Fallback: use static question bank
    const q = generateQuiz(preferences);
    if (q.length === 0) {
      setQuizError('No questions available for these filters. Try selecting more topics or changing difficulty.');
      setQuizLoading(false);
      return;
    }
    setQuestions(q);
    setAnswers(new Array(q.length).fill(null));
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setTimeLeft(preferences.timePerQuestion);
    setTotalTime(0);
    setState('active');
    setQuizLoading(false);
  };

  const handleAnswer = (optionIndex: number) => {
    if (showExplanation) return;
    setSelectedOption(optionIndex);
    setShowExplanation(true);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setTimeLeft(preferences.timePerQuestion);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const score = answers.reduce<number>((s, a, i) => s + (a === questions[i]?.correctIndex ? 1 : 0), 0);
    setState('review');

    // Save to DB
    try {
      await apiFetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generateId(),
          userId: 'default',
          preferences,
          questionIds: questions.map((q) => q.id),
          answers,
          score,
          totalQuestions: questions.length,
          timeSpentSeconds: totalTime,
        }),
      });
    } catch {}
  };

  const score = answers.reduce<number>((s, a, i) => s + (a === questions[i]?.correctIndex ? 1 : 0), 0);
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // ── Setup Screen ──
  if (state === 'setup' || state === 'history') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Brain size={24} className="text-indigo-500" />
              PM Knowledge Quiz
            </h1>
            <p className="text-sm text-slate-500 mt-1">Test your project management knowledge. Configure your quiz preferences below.</p>
          </div>
          <Link href="/learn" className="text-sm text-indigo-500 hover:text-indigo-700">← Back to Learning Hub</Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setState('setup')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${state === 'setup' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
            <Settings2 size={12} className="inline mr-1" /> Configure Quiz
          </button>
          <button onClick={() => setState('history')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${state === 'history' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
            <BarChart3 size={12} className="inline mr-1" /> History & Stats
          </button>
        </div>

        {state === 'setup' ? (
          <div className="space-y-6">
            {/* Topics */}
            <div className="pm-card p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {QUIZ_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setPreferences((p) => ({
                        ...p,
                        topics: p.topics.includes(t.id) ? p.topics.filter((x) => x !== t.id) : [...p.topics, t.id],
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      preferences.topics.includes(t.id)
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 ring-1 ring-indigo-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                {preferences.topics.length === 0 ? 'Select at least one topic' : `${preferences.topics.length} topic${preferences.topics.length > 1 ? 's' : ''} selected`}
              </p>
            </div>

            {/* Certifications */}
            <div className="pm-card p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Certification Focus</h3>
              <div className="flex gap-2">
                {QUIZ_CERTS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setPreferences((p) => ({
                        ...p,
                        certifications: p.certifications.includes(c.id) ? p.certifications.filter((x) => x !== c.id) : [...p.certifications, c.id],
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      preferences.certifications.includes(c.id)
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 ring-1 ring-indigo-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="pm-card p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Difficulty</h3>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as QuizDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setPreferences((p) => ({
                        ...p,
                        difficulty: p.difficulty.includes(d) ? p.difficulty.filter((x) => x !== d) : [...p.difficulty, d],
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      preferences.difficulty.includes(d)
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 ring-1 ring-indigo-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="pm-card p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Questions</label>
                <select
                  value={preferences.questionCount}
                  onChange={(e) => setPreferences((p) => ({ ...p, questionCount: Number(e.target.value) }))}
                  className="field-input mt-1"
                >
                  {[5, 10, 15, 20, 25, 30].map((n) => (
                    <option key={n} value={n}>{n} questions</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Time per Question</label>
                <select
                  value={preferences.timePerQuestion}
                  onChange={(e) => setPreferences((p) => ({ ...p, timePerQuestion: Number(e.target.value) }))}
                  className="field-input mt-1"
                >
                  {[30, 45, 60, 90, 120].map((n) => (
                    <option key={n} value={n}>{n}s</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info */}
            <div className="pm-card p-3 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
              <p className="text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles size={12} />
                AI generates {preferences.questionCount} fresh questions each time based on your preferences. No two quizzes are the same.
              </p>
            </div>

            {quizError && (
              <p className="text-xs text-red-500">{quizError}</p>
            )}

            {/* Start */}
            <button
              onClick={startQuiz}
              disabled={preferences.topics.length === 0 || quizLoading}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {quizLoading ? (
                <><Loader2 size={16} className="mr-1 animate-spin" /> Generating Questions...</>
              ) : (
                <><Sparkles size={16} className="mr-1" /> Start Quiz ({preferences.questionCount} questions)</>
              )}
            </button>
          </div>
        ) : (
          /* History */
          <div className="space-y-4">
            {/* Stats summary */}
            {history.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Total Quizzes" value={history.length} icon={<Target size={16} className="text-indigo-500" />} />
                <StatCard
                  label="Avg Score"
                  value={`${Math.round(history.reduce((s, h: any) => s + (h.score / h.total_questions) * 100, 0) / history.length)}%`}
                  icon={<TrendingUp size={16} className="text-emerald-500" />}
                />
                <StatCard
                  label="Best Score"
                  value={`${Math.round(Math.max(...history.map((h: any) => (h.score / h.total_questions) * 100)))}%`}
                  icon={<Trophy size={16} className="text-amber-500" />}
                />
                <StatCard
                  label="Questions Answered"
                  value={history.reduce((s, h: any) => s + h.total_questions, 0)}
                  icon={<Brain size={16} className="text-violet-500" />}
                />
              </div>
            )}

            {/* History list */}
            {history.length === 0 ? (
              <div className="pm-card p-8 text-center">
                <Brain size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No quizzes taken yet. Start one to track your progress!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h: any) => (
                  <div key={h.id} className="pm-card p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {h.score}/{h.total_questions} ({Math.round((h.score / h.total_questions) * 100)}%)
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(h.completed_at).toLocaleDateString()} · {Math.round(h.time_spent_seconds / 60)}min
                      </p>
                    </div>
                    <div className={`text-xs font-medium px-2 py-0.5 rounded ${
                      (h.score / h.total_questions) >= 0.8
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : (h.score / h.total_questions) >= 0.6
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {(h.score / h.total_questions) >= 0.8 ? 'Great' : (h.score / h.total_questions) >= 0.6 ? 'Good' : 'Needs Work'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Active Quiz ──
  if (state === 'active' && questions.length > 0) {
    const q = questions[currentIndex];
    const isCorrect = selectedOption === q.correctIndex;
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Question {currentIndex + 1} of {questions.length}</span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono flex items-center gap-1 ${timeLeft <= 10 ? 'text-red-500' : 'text-slate-500'}`}>
                <Clock size={12} />
                {timeLeft}s
              </span>
              <span className="text-xs text-slate-400">
                {q.topic} · {q.difficulty}
              </span>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="pm-card p-6 mb-4">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white leading-relaxed">{q.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-2 mb-6">
          {q.options.map((option, i) => {
            let cls = 'pm-card p-4 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all';
            if (showExplanation) {
              if (i === q.correctIndex) {
                cls = 'pm-card p-4 border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
              } else if (i === selectedOption && i !== q.correctIndex) {
                cls = 'pm-card p-4 border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20';
              } else {
                cls = 'pm-card p-4 opacity-50';
              }
            } else if (selectedOption === i) {
              cls = 'pm-card p-4 border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
            }

            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={showExplanation} className={`${cls} w-full text-left`}>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm text-slate-800 dark:text-slate-200">{option}</span>
                  {showExplanation && i === q.correctIndex && <CheckCircle2 size={18} className="text-emerald-500 shrink-0 ml-auto" />}
                  {showExplanation && i === selectedOption && i !== q.correctIndex && <XCircle size={18} className="text-red-500 shrink-0 ml-auto" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`pm-card p-4 mb-4 ${isCorrect ? 'border-emerald-300 dark:border-emerald-700' : 'border-amber-300 dark:border-amber-700'}`}>
            <div className="flex items-center gap-2 mb-1">
              {isCorrect ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <XCircle size={16} className="text-red-500" />
              )}
              <span className={`text-sm font-medium ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{q.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        {showExplanation && (
          <button onClick={nextQuestion} className="btn-primary w-full py-3">
            {currentIndex < questions.length - 1 ? (
              <>Next Question <ArrowRight size={16} className="ml-1" /></>
            ) : (
              <>See Results <Trophy size={16} className="ml-1" /></>
            )}
          </button>
        )}
      </div>
    );
  }

  // ── Review Screen ──
  if (state === 'review') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            pct >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30' : pct >= 60 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            <Trophy size={32} className={pct >= 80 ? 'text-emerald-500' : pct >= 60 ? 'text-amber-500' : 'text-red-500'} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{pct}%</h2>
          <p className="text-sm text-slate-500 mt-1">
            {score} out of {questions.length} correct · {Math.round(totalTime / 60)} minutes
          </p>
          <p className="text-sm font-medium mt-2 text-slate-700 dark:text-slate-300">
            {pct >= 80 ? '🎉 Excellent! You\'re on track!' : pct >= 60 ? '👍 Good effort! Keep studying.' : '📚 Review the topics below and try again.'}
          </p>
        </div>

        {/* Per-question review */}
        <div className="space-y-3 mb-6">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctIndex;
            return (
              <div key={q.id} className={`pm-card p-3 ${isCorrect ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'}`}>
                <div className="flex items-start gap-2">
                  {isCorrect ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> : <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />}
                  <div>
                    <p className="text-xs text-slate-800 dark:text-slate-200">{q.question}</p>
                    {!isCorrect && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Correct: <span className="text-emerald-600 font-medium">{q.options[q.correctIndex]}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setState('setup'); }} className="btn-secondary flex-1 py-2.5">
            <Settings2 size={14} className="mr-1" /> New Quiz
          </button>
          <button onClick={startQuiz} className="btn-primary flex-1 py-2.5">
            <RotateCcw size={14} className="mr-1" /> Retry Same
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="pm-card p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
