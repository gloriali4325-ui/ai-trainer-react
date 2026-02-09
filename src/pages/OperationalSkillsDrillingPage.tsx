import { useEffect, useMemo, useState } from 'react';
import { AnswerCardPanel, AnswerStatus } from '../components/AnswerCardPanel';
import { QuestionCard } from '../components/QuestionCard';
import { useApp } from '../state';
import { checkAnswer, shuffle } from '../lib/utils';
import { readJson, removeKey, writeJson } from '../lib/storage';
import type { Question, CodeQuestion } from '../lib/types';

export function OperationalSkillsDrillingPage() {
  const { codeQuestions, profile, recordAttempt } = useApp();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<unknown>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, unknown>>({});
  const [questionShowExplanation, setQuestionShowExplanation] = useState<Record<string, boolean>>({});
  const [questionStatusMap, setQuestionStatusMap] = useState<Record<string, AnswerStatus>>({});
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);

  const storageKey = profile ? `operational_drilling_progress_${profile.id}` : '';
  const storageStateKey = profile ? `operational_drilling_progress_state_${profile.id}` : '';

  const questions = useMemo<Question[]>(
    () =>
      questionOrder.length
        ? questionOrder
            .map((id) => codeQuestions.find((q) => q.id === id))
            .filter(Boolean) as CodeQuestion[]
        : shuffle(codeQuestions),
    [codeQuestions, questionOrder],
  );

  useEffect(() => {
    if (!storageKey || !storageStateKey || codeQuestions.length === 0) return;
    const savedState = readJson<OperationalState | null>(storageStateKey, null);
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
      return;
    }
    const shuffled = shuffle(codeQuestions).map((q) => q.id);
    setQuestionOrder(shuffled);
    const storedIndex = readJson<number>(storageKey, 0);
    setIndex(storedIndex);
  }, [storageKey, storageStateKey, codeQuestions]);

  useEffect(() => {
    if (!storageKey) return;
    writeJson(storageKey, index);
  }, [index, storageKey]);

  useEffect(() => {
    if (!storageStateKey || questionOrder.length === 0) return;
    const state: OperationalState = {
      questionIds: questionOrder,
      currentIndex: index,
      seenQuestionIds,
      questionStatusMap,
      questionAnswers,
      questionShowExplanation,
    };
    writeJson(storageStateKey, state);
  }, [
    storageStateKey,
    questionOrder,
    index,
    seenQuestionIds,
    questionStatusMap,
    questionAnswers,
    questionShowExplanation,
  ]);

  useEffect(() => {
    if (questions.length > 0 && index >= questions.length) {
      setIndex(0);
    }
  }, [questions.length, index]);

  if (!questions.length) {
    return <div className="container">题库加载中...</div>;
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
    const shuffled = shuffle(codeQuestions).map((q) => q.id);
    setQuestionOrder(shuffled);
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
              <strong>随机练习 · 操作技能</strong>
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

type OperationalState = {
  questionIds: string[];
  currentIndex: number;
  seenQuestionIds: string[];
  questionStatusMap: Record<string, AnswerStatus>;
  questionAnswers: Record<string, unknown>;
  questionShowExplanation: Record<string, boolean>;
};
