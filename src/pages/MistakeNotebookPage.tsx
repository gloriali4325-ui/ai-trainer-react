import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state';
import type { CodeQuestion, Question, TheoryQuestion } from '../lib/types';

export function MistakeNotebookPage() {
  const navigate = useNavigate();
  const { mistakes, updateMistakeStatus, markMistakeReviewed, refreshMistakes, loading, theoryQuestions, codeQuestions } = useApp();
  const [filter, setFilter] = useState<'all' | 'unmastered' | 'mastered'>('unmastered');

  const questionsById = useMemo(() => {
    const map = new Map<string, Question>();
    [...theoryQuestions, ...codeQuestions].forEach((q) => map.set(q.id, q));
    return map;
  }, [theoryQuestions, codeQuestions]);

  const unmastered = mistakes.filter((m) => m.status !== 'mastered');
  const mastered = mistakes.filter((m) => m.status === 'mastered');
  const filtered = filter === 'all' ? mistakes : filter === 'mastered' ? mastered : unmastered;

  if (loading.mistakes) {
    return <div className="container">错题加载中...</div>;
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 16 }}>
      <div className="page-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>错题本</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              未掌握：{unmastered.length} · 已掌握：{mastered.length}
            </div>
          </div>
          <button className="button secondary" onClick={() => refreshMistakes()}>
            刷新列表
          </button>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className={`button ${filter === 'unmastered' ? '' : 'secondary'}`} onClick={() => setFilter('unmastered')}>
            未掌握
          </button>
          <button className={`button ${filter === 'all' ? '' : 'secondary'}`} onClick={() => setFilter('all')}>
            全部
          </button>
          <button className={`button ${filter === 'mastered' ? '' : 'secondary'}`} onClick={() => setFilter('mastered')}>
            已掌握
          </button>
          <button className="button" onClick={() => navigate('/mistakes/reinforcement', { state: { mistakes: unmastered } })}>
            开始强化练习
          </button>
        </div>
      </div>

      {filtered.length === 0 && <div className="panel">暂无错题记录。</div>}

      {filtered.map((mistake) => {
        const question = questionsById.get(mistake.questionId);
        const correctAnswer = question ? formatCorrectAnswer(question) : '未知';
        const userAnswer = formatUserAnswer(mistake.userAnswer);
        return (
          <div key={mistake.id} className="card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="badge">{mistake.status}</span>
              <div className="muted">尝试次数：{mistake.attemptCount}</div>
            </div>
            <div style={{ fontWeight: 600 }}>
              {question ? question.text : `题目 ID：${mistake.questionId}`}
            </div>
            <div className="panel">
              <div className="muted">你的答案</div>
              <div style={{ marginTop: 6 }}>{userAnswer}</div>
              <div className="muted" style={{ marginTop: 10 }}>正确答案</div>
              <div style={{ marginTop: 6 }}>{correctAnswer}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="button secondary" onClick={() => markMistakeReviewed(mistake.id)}>
                标记已复习
              </button>
              <button className="button ghost" onClick={() => updateMistakeStatus(mistake.id, 'mastered')}>
                已掌握
              </button>
              <button className="button ghost" onClick={() => updateMistakeStatus(mistake.id, 'continued')}>
                继续复习
              </button>
              <button className="button ghost" onClick={() => updateMistakeStatus(mistake.id, 'reinforced')}>
                加入再练
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatCorrectAnswer(question: Question): string {
  if (question.section === 'theoretical') {
    const theory = question as TheoryQuestion;
    if (Array.isArray(theory.correctAnswer)) {
      return theory.correctAnswer.join('，');
    }
    return theory.correctAnswer ? String(theory.correctAnswer) : '未提供';
  }
  const code = question as CodeQuestion;
  return code.correctKeywords?.length ? `关键词：${code.correctKeywords.join('，')}` : '未提供';
}

function formatUserAnswer(answer: unknown): string {
  if (answer == null) return '未作答';
  if (Array.isArray(answer)) return answer.join('，');
  if (typeof answer === 'object') {
    try {
      return JSON.stringify(answer);
    } catch {
      return '无法解析';
    }
  }
  const text = String(answer);
  return text.trim().length ? text : '未作答';
}
