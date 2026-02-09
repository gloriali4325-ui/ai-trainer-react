import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnswerCardPanel, AnswerStatus } from '../components/AnswerCardPanel';
import { QuestionCard } from '../components/QuestionCard';
import { useApp } from '../state';
import { checkAnswer } from '../lib/utils';
import { readJson, removeKey, writeJson } from '../lib/storage';
import type { Question, TheoryQuestion } from '../lib/types';

export function CategoryPracticePage() {
  const { id } = useParams();
  const { theoryQuestions, profile, recordAttempt, loadPracticeSession, savePracticeSession, deletePracticeSession } = useApp();
  const categoryId = id ?? '';
  const categoryQuestions = useMemo(
    () => theoryQuestions.filter((q) => q.categoryId === categoryId),
    [theoryQuestions, categoryId],
  );

  const storageKey = profile ? `category_progress_${profile.id}_${categoryId}` : '';
  const storageStateKey = profile ? `category_progress_state_${profile.id}_${categoryId}` : '';
  const dbCategoryKey = categoryId;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<unknown>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, unknown>>({});
  const [questionShowExplanation, setQuestionShowExplanation] = useState<Record<string, boolean>>({});
  const [questionStatusMap, setQuestionStatusMap] = useState<Record<string, AnswerStatus>>({});
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);

  const questions = useMemo<Question[]>(
    () =>
      questionOrder.length
        ? questionOrder
            .map((qid) => categoryQuestions.find((q) => q.id === qid))
            .filter(Boolean) as TheoryQuestion[]
        : categoryQuestions,
    [categoryQuestions, questionOrder],
  );

  useEffect(() => {
    if (!storageKey || !storageStateKey || categoryQuestions.length === 0) return;
    let active = true;
    const load = async () => {
      const remote = await loadPracticeSession(dbCategoryKey);
      if (!active) return;
      if (remote) {
        const ids = categoryQuestions.map((q) => q.id);
        setQuestionOrder(ids);
        const idx = Math.max(0, ids.indexOf(remote));
        setIndex(idx >= 0 ? idx : 0);
        return;
      }
      const savedState = readJson<CategoryState | null>(storageStateKey, null);
      if (savedState) {
        setQuestionOrder(savedState.questionIds);
        setIndex(Math.min(savedState.currentIndex, savedState.questionIds.length - 1));
        setSeenQuestionIds(savedState.seenQuestionIds);
        setQuestionAnswers(savedState.questionAnswers);
        setQuestionShowExplanation(savedState.questionShowExplanation);
        setQuestionStatusMap(savedState.questionStatusMap);
        const currentId = savedState.questionIds[savedState.currentIndex];
        setSelected(savedState.questionAnswers[currentId] ?? null);
        setShowExplanation(savedState.questionShowExplanation[currentId] ?? false);
        await savePracticeSession(dbCategoryKey, currentId);
        return;
      }
      const ids = categoryQuestions.map((q) => q.id);
      setQuestionOrder(ids);
      const storedIndex = readJson<number>(storageKey, 0);
      setIndex(storedIndex);
      const currentId = ids[storedIndex] ?? ids[0];
      await savePracticeSession(dbCategoryKey, currentId);
    };
    load();
    return () => {
      active = false;
    };
  }, [storageKey, storageStateKey, categoryQuestions, loadPracticeSession, savePracticeSession, dbCategoryKey]);

  useEffect(() => {
    if (!storageKey) return;
    writeJson(storageKey, index);
  }, [index, storageKey]);

  useEffect(() => {
    if (!storageStateKey || questionOrder.length === 0) return;
    const state: CategoryState = {
      questionIds: questionOrder,
      currentIndex: index,
      seenQuestionIds,
      questionStatusMap,
      questionAnswers,
      questionShowExplanation,
    };
    writeJson(storageStateKey, state);
    const currentId = questionOrder[index];
    savePracticeSession(dbCategoryKey, currentId);
  }, [
    storageStateKey,
    questionOrder,
    index,
    seenQuestionIds,
    questionStatusMap,
    questionAnswers,
    questionShowExplanation,
    savePracticeSession,
    dbCategoryKey,
  ]);

  useEffect(() => {
    if (questions.length > 0 && index >= questions.length) {
      setIndex(0);
    }
  }, [questions.length, index]);

  if (!questions.length) {
    return <div className="container">该分类暂无题目。</div>;
  }

  const question = questions[index];

  const submit = async () => {
    if (selected == null) return;
    const correct = checkAnswer(question, selected);
    await recordAttempt(question, selected);
    setShowExplanation(true);
    setQuestionAnswers((prev) => ({ ...prev, [question.id]: selected }));
    setQuestionShowExplanation((prev) => ({ ...prev, [question.id]: true }));
    setQuestionStatusMap((prev) => ({ ...prev, [question.id]: correct ? 'correct' : 'incorrect' }));
    setSeenQuestionIds((prev) => (prev.includes(question.id) ? prev : [...prev, question.id]));
  };

  const next = () => {
    const nextIndex = (index + 1) % questions.length;
    const nextQuestion = questions[nextIndex];
    setSelected(questionAnswers[nextQuestion.id] ?? null);
    setShowExplanation(questionShowExplanation[nextQuestion.id] ?? false);
    setIndex(nextIndex);
  };

  const jumpTo = (targetIndex: number) => {
    const target = questions[targetIndex];
    if (!target) return;
    setIndex(targetIndex);
    setSelected(questionAnswers[target.id] ?? null);
    setShowExplanation(questionShowExplanation[target.id] ?? false);
  };

  const resetProgress = () => {
    if (storageKey) removeKey(storageKey);
    if (storageStateKey) removeKey(storageStateKey);
    deletePracticeSession(dbCategoryKey);
    setQuestionOrder(categoryQuestions.map((q) => q.id));
    setIndex(0);
    setSelected(null);
    setShowExplanation(false);
    setQuestionAnswers({});
    setQuestionShowExplanation({});
    setQuestionStatusMap({});
    setSeenQuestionIds([]);
  };

  const answerItems = questions.map((q, idx) => {
    let status = questionStatusMap[q.id] ?? 'unseen';
    if (status === 'unseen' && seenQuestionIds.includes(q.id)) {
      status = 'unanswered';
    }
    return { id: q.id, index: idx, status };
  });

  return (
    <div className="container">
      <div className="split-layout">
        <div>
          <div className="panel" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <strong>分类练习</strong>
              <div className="muted">按当前分类顺序练习</div>
            </div>
            <div className="muted">进度：{index + 1} / {questions.length}</div>
          </div>
          <QuestionCard
            question={question}
            questionNumber={index + 1}
            selectedAnswer={selected}
            onAnswerSelected={setSelected}
            showExplanation={showExplanation}
          />
          <div className="footer-actions">
            <div>
              {index + 1} / {questions.length}
            </div>
            {!showExplanation ? (
              <button className="button" onClick={submit} disabled={selected == null}>
                提交答案
              </button>
            ) : (
              <button className="button" onClick={next}>
                下一题
              </button>
            )}
            <button className="button ghost" onClick={resetProgress}>
              重置进度
            </button>
          </div>
        </div>
        <AnswerCardPanel items={answerItems} currentIndex={index} onJump={jumpTo} />
      </div>
    </div>
  );
}

type CategoryState = {
  questionIds: string[];
  currentIndex: number;
  seenQuestionIds: string[];
  questionStatusMap: Record<string, AnswerStatus>;
  questionAnswers: Record<string, unknown>;
  questionShowExplanation: Record<string, boolean>;
};
