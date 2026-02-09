import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type {
  Category,
  CodeQuestion,
  ExamResult,
  MistakeRecord,
  Question,
  Statistics,
  TheoryQuestion,
  UserProfile,
} from './lib/types';
import { supabase } from './lib/supabase';
import { loadQuestionBank } from './lib/questionBank';
import { checkAnswer, nowIso, shuffle } from './lib/utils';
import { readJson, writeJson } from './lib/storage';

const PROFILE_PREFIX = 'user_profile_';
const STATS_PREFIX = 'user_statistics_';
const EXAM_RESULTS_KEY = 'exam_results';

const mistakeMode = 'mistake_notebook';

const defaultStats: Statistics = {
  totalQuestionsAttempted: 0,
  totalQuestionsCorrect: 0,
  mockExamsTaken: 0,
  lastUpdateTime: null,
};

type AppContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  stats: Statistics;
  categories: Category[];
  theoryQuestions: TheoryQuestion[];
  codeQuestions: CodeQuestion[];
  mistakes: MistakeRecord[];
  examResults: ExamResult[];
  loading: {
    auth: boolean;
    questions: boolean;
    mistakes: boolean;
  };
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, nickname: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  recordAttempt: (question: Question, answer: unknown) => Promise<boolean>;
  recordMockExam: (result: ExamResult) => void;
  refreshMistakes: () => Promise<void>;
  updateMistakeStatus: (mistakeId: string, status: MistakeRecord['status']) => Promise<void>;
  markMistakeReviewed: (mistakeId: string) => Promise<void>;
  addMistake: (questionId: string, answer: unknown) => Promise<void>;
  loadPracticeSession: (category: string) => Promise<string | null>;
  savePracticeSession: (category: string, currentQuestionId: string | null) => Promise<void>;
  deletePracticeSession: (category: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

type PracticeSessionLoad = string | null;

function loadProfile(userId: string, fallbackName: string): UserProfile {
  const key = `${PROFILE_PREFIX}${userId}`;
  const existing = readJson<UserProfile | null>(key, null);
  if (existing) return existing;
  const now = nowIso();
  const profile: UserProfile = {
    id: userId,
    name: fallbackName || 'AI Trainer Student',
    createdAt: now,
    updatedAt: now,
  };
  writeJson(key, profile);
  return profile;
}

function loadStats(userId: string): Statistics {
  return readJson(`${STATS_PREFIX}${userId}`, defaultStats);
}

function saveStats(userId: string, stats: Statistics): void {
  writeJson(`${STATS_PREFIX}${userId}`, stats);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Statistics>(defaultStats);
  const [categories, setCategories] = useState<Category[]>([]);
  const [theoryQuestions, setTheoryQuestions] = useState<TheoryQuestion[]>([]);
  const [codeQuestions, setCodeQuestions] = useState<CodeQuestion[]>([]);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState({ auth: true, questions: true, mistakes: true });

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading((prev) => ({ ...prev, auth: false }));
    };
    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setStats(defaultStats);
          setMistakes([]);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const fallbackName = user.email ?? 'AI Trainer Student';
    const loaded = loadProfile(user.id, fallbackName);
    setProfile(loaded);
    setStats(loadStats(user.id));
    setExamResults(readJson<ExamResult[]>(EXAM_RESULTS_KEY, []));
  }, [user]);

  useEffect(() => {
    let active = true;
    const loadQuestions = async () => {
      setLoading((prev) => ({ ...prev, questions: true }));
      const data = await loadQuestionBank();
      if (!active) return;
      setCategories(data.categories);
      setTheoryQuestions(data.theoryQuestions);
      setCodeQuestions(data.codeQuestions);
      setLoading((prev) => ({ ...prev, questions: false }));
    };
    loadQuestions();
    return () => {
      active = false;
    };
  }, []);

  const refreshMistakes = useCallback(async () => {
    if (!user) return;
    setLoading((prev) => ({ ...prev, mistakes: true }));
    const { data } = await supabase
      .from('user_attempts')
      .select('id,user_id,question_id,user_answer,answered_at,mode,is_correct')
      .eq('user_id', user.id)
      .eq('mode', mistakeMode)
      .order('answered_at', { ascending: false });
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const deduped = new Map<string, MistakeRecord>();
    rows.forEach((row) => {
      const userAnswer = row.user_answer as Record<string, unknown> | null;
      const attemptedAt = (row.answered_at as string) ?? nowIso();
      const mistakeType = (userAnswer?.mistake_type as string) || (userAnswer?.mistakeType as string);
      const status = (userAnswer?.status as string) || 'reviewing';
      const record: MistakeRecord = {
        id: String(row.id ?? crypto.randomUUID()),
        userId: String(row.user_id ?? ''),
        questionId: String(row.question_id ?? ''),
        userAnswer: userAnswer?.answer ?? userAnswer,
        attemptedAt,
        attemptCount: Number(userAnswer?.attempt_count ?? userAnswer?.attemptCount ?? 1),
        reviewed: Boolean(userAnswer?.reviewed ?? false),
        mistakeType: mistakeType?.includes('unanswered') ? 'unanswered' : 'wrongAnswer',
        status: status as MistakeRecord['status'],
        createdAt: attemptedAt,
        updatedAt: attemptedAt,
      };
      if (!deduped.has(record.questionId)) deduped.set(record.questionId, record);
    });
    setMistakes(Array.from(deduped.values()));
    setLoading((prev) => ({ ...prev, mistakes: false }));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshMistakes();
  }, [user, refreshMistakes]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    if (data.user) {
      setProfile(loadProfile(data.user.id, email));
      setStats(loadStats(data.user.id));
    }
    return null;
  }, []);

  const signUp = useCallback(async (email: string, password: string, nickname: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (data.user?.id) {
      await supabase.from('user_profile').insert({ user_id: data.user.id, nickname: nickname.trim() });
      setProfile(loadProfile(data.user.id, nickname || email));
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const recordAttempt = useCallback(
    async (question: Question, answer: unknown) => {
      if (!user) return false;
      const correct = checkAnswer(question, answer);
      const updatedStats: Statistics = {
        totalQuestionsAttempted: stats.totalQuestionsAttempted + 1,
        totalQuestionsCorrect: stats.totalQuestionsCorrect + (correct ? 1 : 0),
        mockExamsTaken: stats.mockExamsTaken,
        lastUpdateTime: nowIso(),
      };
      setStats(updatedStats);
      saveStats(user.id, updatedStats);

      if (!correct) {
        await addMistake(question.id, answer);
      }
      return correct;
    },
    [user, stats],
  );

  const recordMockExam = useCallback(
    (result: ExamResult) => {
      const updated = [result, ...examResults];
      setExamResults(updated);
      writeJson(EXAM_RESULTS_KEY, updated);
      if (user) {
        const updatedStats: Statistics = {
          totalQuestionsAttempted: stats.totalQuestionsAttempted,
          totalQuestionsCorrect: stats.totalQuestionsCorrect,
          mockExamsTaken: stats.mockExamsTaken + 1,
          lastUpdateTime: nowIso(),
        };
        setStats(updatedStats);
        saveStats(user.id, updatedStats);
      }
    },
    [examResults, stats, user],
  );

  const addMistake = useCallback(
    async (questionId: string, answer: unknown) => {
      if (!user) return;
      const now = nowIso();
      const mistakeType = answer == null ? 'unanswered' : 'wrongAnswer';
      const payload = {
        answer,
        attempt_count: 1,
        reviewed: false,
        mistake_type: mistakeType,
        status: 'reviewing',
      };
      await supabase.from('user_attempts').insert({
        user_id: user.id,
        question_id: questionId,
        mode: mistakeMode,
        user_answer: payload,
        is_correct: false,
        answered_at: now,
      });
      await refreshMistakes();
    },
    [refreshMistakes, user],
  );

  const updateMistakeStatus = useCallback(
    async (mistakeId: string, status: MistakeRecord['status']) => {
      const target = mistakes.find((m) => m.id === mistakeId);
      if (!target) return;
      const payload = {
        answer: target.userAnswer,
        attempt_count: target.attemptCount,
        reviewed: target.reviewed,
        mistake_type: target.mistakeType,
        status,
      };
      await supabase.from('user_attempts').update({ user_answer: payload, answered_at: nowIso() }).eq('id', mistakeId);
      await refreshMistakes();
    },
    [mistakes, refreshMistakes],
  );

  const markMistakeReviewed = useCallback(
    async (mistakeId: string) => {
      const target = mistakes.find((m) => m.id === mistakeId);
      if (!target) return;
      const payload = {
        answer: target.userAnswer,
        attempt_count: target.attemptCount,
        reviewed: true,
        mistake_type: target.mistakeType,
        status: target.status,
      };
      await supabase.from('user_attempts').update({ user_answer: payload, answered_at: nowIso() }).eq('id', mistakeId);
      await refreshMistakes();
    },
    [mistakes, refreshMistakes],
  );

  const loadPracticeSession = useCallback(
    async (category: string): Promise<PracticeSessionLoad> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('current_question_id')
        .eq('user_id', user.id)
        .eq('category', category)
        .maybeSingle();
      if (error || !data) return null;
      return (data.current_question_id as string | null) ?? null;
    },
    [user],
  );

  const savePracticeSession = useCallback(
    async (category: string, currentQuestionId: string | null) => {
      if (!user) return;
      const row = {
        user_id: user.id,
        category,
        current_question_id: currentQuestionId,
        status: 'in_progress',
        updated_at: nowIso(),
      };
      await supabase.from('practice_sessions').upsert(row, {
        onConflict: 'user_id,category',
      });
    },
    [user],
  );

  const deletePracticeSession = useCallback(
    async (category: string) => {
      if (!user) return;
      await supabase.from('practice_sessions').delete().eq('user_id', user.id).eq('category', category);
    },
    [user],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      user,
      profile,
      stats,
      categories,
      theoryQuestions,
      codeQuestions,
      mistakes,
      examResults,
      loading,
      signIn,
      signUp,
      signOut,
      recordAttempt,
      recordMockExam,
      refreshMistakes,
      updateMistakeStatus,
      markMistakeReviewed,
      addMistake,
      loadPracticeSession,
      savePracticeSession,
      deletePracticeSession,
    }),
    [
      session,
      user,
      profile,
      stats,
      categories,
      theoryQuestions,
      codeQuestions,
      mistakes,
      examResults,
      loading,
      signIn,
      signUp,
      signOut,
      recordAttempt,
      recordMockExam,
      refreshMistakes,
      updateMistakeStatus,
      markMistakeReviewed,
      addMistake,
      loadPracticeSession,
      savePracticeSession,
      deletePracticeSession,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export function useRandomQuestions() {
  const { theoryQuestions, codeQuestions } = useApp();
  const mixed = useMemo(() => shuffle<Question>([...theoryQuestions, ...codeQuestions]), [theoryQuestions, codeQuestions]);
  return mixed;
}

export function useExamQuestions(total = 30): Question[] {
  const { theoryQuestions, codeQuestions } = useApp();
  return useMemo(() => {
    const theoryCount = Math.round(total * 0.7);
    const operationalCount = total - theoryCount;
    const selectedTheory = shuffle(theoryQuestions).slice(0, theoryCount);
    const selectedOperational = shuffle(codeQuestions).slice(0, operationalCount);
    return shuffle([...selectedTheory, ...selectedOperational]);
  }, [codeQuestions, theoryQuestions, total]);
}

export function createExamResult(payload: Omit<ExamResult, 'id' | 'createdAt' | 'updatedAt'>): ExamResult {
  const now = nowIso();
  return {
    ...payload,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}
