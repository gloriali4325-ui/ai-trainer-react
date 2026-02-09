import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnswerCardPanel, AnswerStatus } from '../components/AnswerCardPanel';
import { QuestionCard } from '../components/QuestionCard';
import { useApp, createExamResult } from '../state';
import { checkAnswer, shuffle, nowIso } from '../lib/utils';
import type { Question } from '../lib/types';

const EXAM_DURATION_SECONDS = 90 * 60;

export function MockExamPage() {
  const navigate = useNavigate();
  const { profile, recordMockExam, theoryQuestions } = useApp();

  const questions = useMemo<Question[]>(() => {
    const trueFalse = theoryQuestions.filter((q) => q.type === 'trueFalse');
    const single = theoryQuestions.filter((q) => q.type === 'singleChoice');
    const multiple = theoryQuestions.filter((q) => q.type === 'multipleChoice');

    const selectedTrueFalse = shuffle(trueFalse).slice(0, 40);
    const selectedSingle = shuffle(single).slice(0, 140);
    const selectedMultiple = shuffle(multiple).slice(0, 10);

    return [...selectedTrueFalse, ...selectedSingle, ...selectedMultiple];
  }, [theoryQuestions]);

  const counts = useMemo(() => {
    const tf = theoryQuestions.filter((q) => q.type === 'trueFalse').length;
    const sc = theoryQuestions.filter((q) => q.type === 'singleChoice').length;
    const mc = theoryQuestions.filter((q) => q.type === 'multipleChoice').length;
    return { tf, sc, mc };
  }, [theoryQuestions]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<unknown>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);
  const [dismissedSections, setDismissedSections] = useState<string[]>([]);
  const [startTime] = useState(() => Date.now());
  const [remaining, setRemaining] = useState(EXAM_DURATION_SECONDS);
  const submittedRef = useRef(false);
  const latestRef = useRef({
    answers: {} as Record<string, unknown>,
    selected: null as unknown,
    questionId: '',
  });

  const question = questions[index];
  const isLast = index === questions.length - 1;

  useEffect(() => {
    if (!question) return;
    latestRef.current = {
      answers,
      selected,
      questionId: question.id,
    };
  }, [answers, selected, question]);

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const nextRemaining = Math.max(EXAM_DURATION_SECONDS - elapsed, 0);
      setRemaining(nextRemaining);
      if (nextRemaining === 0) {
        finishExam(true);
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    const current = questions[index];
    if (!current) return;
    setSeenQuestionIds((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]));
  }, [index, questions]);

  const syncAnswer = (value: unknown) => {
    setSelected(value);
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const goNext = () => {
    if (isLast) return;
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setSelected(answers[questions[nextIndex]?.id] ?? null);
  };

  const goPrev = () => {
    if (index === 0) return;
    const prevIndex = index - 1;
    setIndex(prevIndex);
    setSelected(answers[questions[prevIndex]?.id] ?? null);
  };

  const jumpTo = (targetIndex: number) => {
    const target = questions[targetIndex];
    if (!target) return;
    setIndex(targetIndex);
    setSelected(answers[target.id] ?? null);
  };

  const toggleFlag = () => {
    if (!question) return;
    setFlagged((prev) =>
      prev.includes(question.id) ? prev.filter((id) => id !== question.id) : [...prev, question.id],
    );
  };

  const sectionMeta = {
    trueFalse: { title: '判断题', count: 40, perScore: 0.5, totalScore: 20 },
    singleChoice: { title: '单选题', count: 140, perScore: 0.5, totalScore: 70 },
    multipleChoice: { title: '多选题', count: 10, perScore: 1, totalScore: 10 },
  } as const;

  const sectionStartIndex = useMemo(() => {
    const firstIndexByType = new Map<string, number>();
    questions.forEach((q, idx) => {
      if (!firstIndexByType.has(q.type)) {
        firstIndexByType.set(q.type, idx);
      }
    });
    return firstIndexByType;
  }, [questions]);

  const currentSectionKey = question?.type ?? 'trueFalse';
  const shouldShowSectionGate =
    question &&
    sectionStartIndex.get(currentSectionKey) === index &&
    !dismissedSections.includes(currentSectionKey);

  const flagAndNext = () => {
    if (!question) return;
    setFlagged((prev) => (prev.includes(question.id) ? prev : [...prev, question.id]));
    goNext();
  };

  const clearAnswer = () => {
    if (!question) return;
    setSelected(null);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });
  };

  const finishExam = (auto = false) => {
    if (submittedRef.current) return;
    if (!auto) {
      const confirmSubmit = window.confirm('确认要提交考试吗？未作答题目将按 0 分计算。');
      if (!confirmSubmit) return;
    }
    submittedRef.current = true;
    const snapshot = latestRef.current;
    const finalAnswers = { ...snapshot.answers, [snapshot.questionId]: snapshot.selected };
    const duration = Math.min(EXAM_DURATION_SECONDS, Math.floor((Date.now() - startTime) / 1000));
    let totalScore = 0;
    const questionResults: Record<string, unknown> = {};

    questions.forEach((q) => {
      const answer = finalAnswers[q.id];
      const correct = checkAnswer(q, answer);
      if (correct) {
        if (q.type === 'trueFalse') totalScore += 0.5;
        else if (q.type === 'singleChoice') totalScore += 0.5;
        else if (q.type === 'multipleChoice') totalScore += 1;
      }
      questionResults[q.id] = {
        answer,
        correct,
        questionText: q.text,
      };
    });

    const result = createExamResult({
      userId: profile?.id ?? 'anonymous',
      examDate: nowIso(),
      totalQuestions: questions.length,
      totalScore,
      maxScore: 100,
      duration,
      questionResults,
    });

    recordMockExam(result);
    navigate(`/exam-result/${result.id}`, { replace: auto });
  };

  if (counts.tf < 40 || counts.sc < 140 || counts.mc < 10) {
    return (
      <div className="container">
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <strong>题库数量不足，无法生成完整模拟考试</strong>
          <div className="muted">判断题：{counts.tf} / 40</div>
          <div className="muted">单选题：{counts.sc} / 140</div>
          <div className="muted">多选题：{counts.mc} / 10</div>
        </div>
      </div>
    );
  }

  if (!question) {
    return <div className="container">正在生成试卷...</div>;
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const answeredCount = Object.values(answers).filter((value) => value != null).length;
  const flaggedCount = flagged.length;
  const unansweredCount = questions.length - answeredCount;

  const answerItems = questions.map((q, idx) => {
    let status: AnswerStatus = 'unseen';
    if (flagged.includes(q.id)) status = 'flagged';
    else if (answers[q.id] != null) status = 'answered';
    else if (seenQuestionIds.includes(q.id)) status = 'unanswered';
    return { id: q.id, index: idx, status };
  });

  return (
    <div className="container">
      {shouldShowSectionGate && (
        <div className="exam-overlay">
          <div className="card exam-overlay-card">
            <h3 style={{ marginTop: 0 }}>{sectionMeta[currentSectionKey].title}</h3>
            <div className="muted" style={{ marginBottom: 12 }}>
              本部分题目数量：{sectionMeta[currentSectionKey].count} 题
            </div>
            <div className="muted">单题分值：{sectionMeta[currentSectionKey].perScore} 分</div>
            <div className="muted" style={{ marginBottom: 16 }}>
              本部分总分：{sectionMeta[currentSectionKey].totalScore} 分
            </div>
            <button
              className="button"
              style={{ width: '100%' }}
              onClick={() =>
                setDismissedSections((prev) =>
                  prev.includes(currentSectionKey) ? prev : [...prev, currentSectionKey],
                )
              }
            >
              开始答题
            </button>
          </div>
        </div>
      )}
      <div className="split-layout">
        <div>
          <div className="panel" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>模拟考试</strong>
                <div className="muted">共 {questions.length} 题 · 及格线 60 分</div>
              </div>
              <div style={{ fontWeight: 600 }}>
                剩余时间：{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
            </div>
            <div className="muted">已答：{answeredCount} · 未答：{unansweredCount} · 标记：{flaggedCount}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="button secondary" onClick={toggleFlag}>
                {flagged.includes(question.id) ? '取消标记' : '标记本题'}
              </button>
              <button className="button secondary" onClick={clearAnswer}>
                清除答案
              </button>
              <button className="button ghost" onClick={() => finishExam(false)}>
                交卷
              </button>
            </div>
          </div>
          <QuestionCard
            question={question}
            questionNumber={index + 1}
            selectedAnswer={selected}
            onAnswerSelected={syncAnswer}
          />
          <div className="footer-actions">
            <div>
              {index + 1} / {questions.length}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="button secondary" onClick={goPrev} disabled={index === 0}>
                上一题
              </button>
              {!isLast ? (
                <>
                  <button className="button" onClick={goNext}>
                    保存并下一题
                  </button>
                  <button className="button secondary" onClick={flagAndNext}>
                    标记并下一题
                  </button>
                </>
              ) : (
                <button className="button" onClick={() => finishExam(false)}>
                  提交考试
                </button>
              )}
            </div>
          </div>
        </div>
        <AnswerCardPanel
          title="答题记录"
          items={answerItems}
          currentIndex={index}
          onJump={jumpTo}
          showLegend
          legendMode="exam"
          sections={[
            { label: '判断题 (1-40)', startIndex: 0, endIndex: 39 },
            { label: '单选题 (41-180)', startIndex: 40, endIndex: 179 },
            { label: '多选题 (181-190)', startIndex: 180, endIndex: 189 },
          ]}
        />
      </div>
    </div>
  );
}
