import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import { useApp } from '../state';
import { checkAnswer } from '../lib/utils';
import type { MistakeRecord, Question } from '../lib/types';

export function MistakeReinforcementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mistakes, theoryQuestions, codeQuestions, updateMistakeStatus, markMistakeReviewed } = useApp();

  const passedMistakes = (location.state as { mistakes?: MistakeRecord[] } | null)?.mistakes;
  const sourceMistakes = passedMistakes ?? mistakes.filter((m) => m.status !== 'mastered');

  const questionsById = useMemo(() => {
    const map = new Map<string, Question>();
    [...theoryQuestions, ...codeQuestions].forEach((q) => map.set(q.id, q));
    return map;
  }, [theoryQuestions, codeQuestions]);

  const items = sourceMistakes
    .map((mistake) => ({ mistake, question: questionsById.get(mistake.questionId) }))
    .filter((item): item is { mistake: MistakeRecord; question: Question } => Boolean(item.question));

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<unknown>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  if (items.length === 0) {
    return <div className="container">暂无可强化的错题。</div>;
  }

  const item = items[index];

  const submit = async () => {
    if (selected == null || (typeof selected === 'string' && selected.trim().length === 0)) {
      return;
    }
    const correct = checkAnswer(item.question, selected);
    await updateMistakeStatus(item.mistake.id, correct ? 'mastered' : 'reinforced');
    await markMistakeReviewed(item.mistake.id);
    setShowExplanation(true);
  };

  const next = () => {
    if (index >= items.length - 1) {
      navigate('/mistakes');
      return;
    }
    setIndex((prev) => prev + 1);
    setSelected(null);
    setShowExplanation(false);
  };

  return (
    <div className="container">
      <div className="panel" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <strong>错题强化</strong>
          <div className="muted">复习错题，巩固知识点</div>
        </div>
        <div className="muted">进度：{index + 1} / {items.length}</div>
      </div>
      <QuestionCard
        question={item.question}
        questionNumber={index + 1}
        selectedAnswer={selected}
        onAnswerSelected={setSelected}
        showExplanation={showExplanation}
      />
      <div className="footer-actions">
        <div>
          {index + 1} / {items.length}
        </div>
        {!showExplanation ? (
          <button className="button" onClick={submit} disabled={selected == null}>
            提交
          </button>
        ) : (
          <button className="button" onClick={next}>
            {index >= items.length - 1 ? '完成' : '下一题'}
          </button>
        )}
      </div>
    </div>
  );
}
