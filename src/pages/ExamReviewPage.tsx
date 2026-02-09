import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import { useApp } from '../state';
import type { Question } from '../lib/types';

function isUnanswered(answer: unknown): boolean {
  if (answer == null) return true;
  if (typeof answer === 'string') return answer.trim().length === 0;
  if (Array.isArray(answer)) return answer.length === 0;
  return false;
}

export function ExamReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { examResults, theoryQuestions, codeQuestions } = useApp();

  const result = examResults.find((item) => item.id === id);

  const questionsById = useMemo(() => {
    const map = new Map<string, Question>();
    [...theoryQuestions, ...codeQuestions].forEach((q) => map.set(q.id, q));
    return map;
  }, [theoryQuestions, codeQuestions]);

  if (!result) {
    return <div className="container">未找到该考试结果。</div>;
  }

  const wrongQuestions = Object.entries(result.questionResults)
    .map(([questionId, value]) => ({
      questionId,
      detail: value as { answer?: unknown; correct?: boolean },
    }))
    .filter((item) => item.detail.correct === false)
    .filter((item) => !isUnanswered(item.detail.answer))
    .map((item) => ({
      question: questionsById.get(item.questionId),
      userAnswer: item.detail.answer,
    }))
    .filter((item): item is { question: Question; userAnswer: unknown } => Boolean(item.question));

  return (
    <div className="container" style={{ display: 'grid', gap: 16 }}>
      <div className="page-hero">
        <strong>题目解析</strong>
        <div className="muted">仅展示本次考试答错的题目（未作答不显示）</div>
      </div>

      {wrongQuestions.length === 0 && <div className="panel">暂无错题记录。</div>}

      {wrongQuestions.map((item, idx) => {
        const question = item.question;
        return (
          <QuestionCard
            key={question.id}
            question={question}
            questionNumber={idx + 1}
            selectedAnswer={item.userAnswer}
            onAnswerSelected={() => undefined}
            showExplanation
            readOnly
          />
        );
      })}

      <button className="button secondary" onClick={() => navigate(-1)}>
        返回成绩
      </button>
    </div>
  );
}
