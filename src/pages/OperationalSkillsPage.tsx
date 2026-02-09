import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnswerCardPanel, AnswerStatus } from '../components/AnswerCardPanel';
import { QuestionCard } from '../components/QuestionCard';
import { useApp } from '../state';
import { checkAnswer } from '../lib/utils';
import { readJson, removeKey, writeJson } from '../lib/storage';
import type { Question, CodeQuestion } from '../lib/types';

export function OperationalSkillsPage() {
  const { id } = useParams();
  const { codeQuestions, profile, recordAttempt, loadPracticeSession, savePracticeSession } = useApp();
  const categoryId = id ?? '';
  const categoryQuestions = useMemo(
    () => codeQuestions.filter((q) => q.categoryId === categoryId),
    [codeQuestions, categoryId],
  );

  const storageKey = profile ? `operational_progress_${profile.id}_${categoryId}` : '';
  const storageStateKey = profile ? `operational_progress_state_${profile.id}_${categoryId}` : '';
  const dbCategoryKey = `operational:${categoryId}`;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<unknown>('');
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
            .filter(Boolean) as CodeQuestion[]
        : categoryQuestions,
    [categoryQuestions, questionOrder],
  );

  useEffect(() => {
    if (!storageKey || !storageStateKey || categoryQuestions.length === 0) return;
    let active = true;
    const load = async () => {
      const remote = await loadPracticeSession(dbCategoryKey);
      if (!active) return;
      if (remote?.state) {
        setQuestionOrder(remote.state.questionIds);
        setIndex(Math.min(remote.state.currentIndex, remote.state.questionIds.length - 1));
        setSeenQuestionIds(remote.state.seenQuestionIds);
        setQuestionAnswers(remote.state.questionAnswers);
        setQuestionShowExplanation(remote.state.questionShowExplanation);
        setQuestionStatusMap(remote.state.questionStatusMap);
        const currentId = remote.state.questionIds[remote.state.currentIndex];
        setSelected(remote.state.questionAnswers[currentId] ?? '');
        setShowExplanation(remote.state.questionShowExplanation[currentId] ?? false);
        return;
      }
      const savedState = readJson<OperationalCategoryState | null>(storageStateKey, null);
      if (savedState) {
        setQuestionOrder(savedState.questionIds);
        setIndex(Math.min(savedState.currentIndex, savedState.questionIds.length - 1));
        setSeenQuestionIds(savedState.seenQuestionIds);
        setQuestionAnswers(savedState.questionAnswers);
        setQuestionShowExplanation(savedState.questionShowExplanation);
        setQuestionStatusMap(savedState.questionStatusMap);
        const currentId = savedState.questionIds[savedState.currentIndex];
        setSelected(savedState.questionAnswers[currentId] ?? '');
        setShowExplanation(savedState.questionShowExplanation[currentId] ?? false);
        await savePracticeSession(dbCategoryKey, {
          currentQuestionId: currentId,
          state: savedState,
        });
        return;
      }
      const ids = categoryQuestions.map((q) => q.id);
      setQuestionOrder(ids);
      const storedIndex = readJson<number>(storageKey, 0);
      setIndex(storedIndex);
      const currentId = ids[storedIndex] ?? ids[0];
      await savePracticeSession(dbCategoryKey, {
        currentQuestionId: currentId,
        state: {
          questionIds: ids,
          currentIndex: storedIndex,
          seenQuestionIds: [],
          questionStatusMap: {},
          questionAnswers: {},
          questionShowExplanation: {},
        },
      });
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
    const state: OperationalCategoryState = {
      questionIds: questionOrder,
      currentIndex: index,
      seenQuestionIds,
      questionStatusMap,
      questionAnswers,
      questionShowExplanation,
    };
    writeJson(storageStateKey, state);
    const currentId = questionOrder[index];
    savePracticeSession(dbCategoryKey, { currentQuestionId: currentId, state });
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
    if (typeof selected !== 'string' || selected.trim().length === 0) return;
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
    setSelected(questionAnswers[nextQuestion.id] ?? '');
    setShowExplanation(questionShowExplanation[nextQuestion.id] ?? false);
    setIndex(nextIndex);
  };

  const jumpTo = (targetIndex: number) => {
    const target = questions[targetIndex];
    if (!target) return;
    setIndex(targetIndex);
    setSelected(questionAnswers[target.id] ?? '');
    setShowExplanation(questionShowExplanation[target.id] ?? false);
  };

  const resetProgress = () => {
    if (storageKey) removeKey(storageKey);
    if (storageStateKey) removeKey(storageStateKey);
    savePracticeSession(dbCategoryKey, { currentQuestionId: undefined, state: undefined });
    setQuestionOrder(categoryQuestions.map((q) => q.id));
    setIndex(0);
    setSelected('');
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
              <strong>操作技能练习</strong>
              <div className="muted">实操题 · 代码题</div>
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
              <button className="button" onClick={submit} disabled={!selected || String(selected).trim().length === 0}>
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

type OperationalCategoryState = {
  questionIds: string[];
  currentIndex: number;
  seenQuestionIds: string[];
  questionStatusMap: Record<string, AnswerStatus>;
  questionAnswers: Record<string, unknown>;
  questionShowExplanation: Record<string, boolean>;
};
